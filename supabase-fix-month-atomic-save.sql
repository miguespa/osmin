-- ============================================================
-- Osmin — Guardado atómico de meses + historial recuperable
-- Pega este bloque en Supabase → SQL Editor → Run
--
-- Qué hace:
--   1. Crea `month_snapshots`: histórico append-only, desacoplado de
--      `months` (sin FK), con una copia JSON completa de cada guardado.
--   2. Crea la función `save_month(...)`: reemplaza el guardado por
--      pasos independientes de days/habits/goals por UNA transacción
--      atómica (todo o nada), eliminando la condición de carrera que
--      podía dejar `days` borrados sin reinsertar.
--   3. Backfill puntual: regenera los 31 días perdidos de julio 2026
--      para el usuario de pruebas (sus 5 hábitos ya existían).
-- ============================================================

-- ── 1. Tabla de snapshots histórica ──────────────────────────────────────────
create table if not exists public.month_snapshots (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  year       int         not null,
  month      int         not null,
  snapshot   jsonb       not null,   -- { habits: [...], days: [...], goals: [...] }
  source     text        not null default 'client',
  created_at timestamptz not null default now()
);

create index if not exists idx_month_snapshots_lookup
  on public.month_snapshots (user_id, year, month, created_at desc);

alter table public.month_snapshots enable row level security;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'month_snapshots' AND policyname = 'own month_snapshots'
  ) THEN
    CREATE POLICY "own month_snapshots" ON public.month_snapshots
      FOR ALL USING (user_id = public.clerk_user_id()) WITH CHECK (user_id = public.clerk_user_id());
  END IF;
END $$;

-- ── 2. Función RPC: guardado atómico de un mes ───────────────────────────────
-- SECURITY INVOKER (por defecto): corre con el rol de quien llama, respeta
-- las políticas RLS existentes tal cual. El user_id NUNCA se recibe como
-- parámetro — se deriva de clerk_user_id() para que el cliente no pueda
-- escribir en nombre de otro usuario.
create or replace function public.save_month(
  p_year int,
  p_month int,
  p_habits jsonb,
  p_days jsonb,
  p_goals jsonb,
  p_source text default 'client'
) returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
begin
  v_user_id := public.clerk_user_id();
  if v_user_id is null then
    raise exception 'save_month: no autenticado';
  end if;

  -- Upsert de months en un único statement (sin el round-trip insert→23505→re-fetch de antes)
  insert into public.months (user_id, year, month)
  values (v_user_id, p_year, p_month)
  on conflict (user_id, year, month) do nothing
  returning id into v_month_id;

  if v_month_id is null then
    select id into v_month_id from public.months
    where user_id = v_user_id and year = p_year and month = p_month;
  end if;

  -- days: borra+reinserta solo si hay filas que escribir (defensa adicional,
  -- la protección real es que todo esto vive en una única transacción)
  if jsonb_array_length(p_days) > 0 then
    delete from public.days where month_id = v_month_id;
    insert into public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
    select v_month_id, v_user_id, x.day, x.weekday, x.status, x.highlight, x.milestone, x.habit_values
    from jsonb_to_recordset(p_days) as x(
      day int, weekday int, status text, highlight text, milestone boolean, habit_values jsonb
    );
  end if;

  -- habits
  if jsonb_array_length(p_habits) > 0 then
    delete from public.habits where month_id = v_month_id;
    insert into public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
    select v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
    from jsonb_to_recordset(p_habits) as x(
      app_id text, label text, short text, type text, color text,
      goal int, target_per_week int, unit text, position int
    );
  end if;

  -- goals
  delete from public.goals where month_id = v_month_id;
  if jsonb_array_length(p_goals) > 0 then
    insert into public.goals (month_id, user_id, app_id, text, done, position)
    select v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
    from jsonb_to_recordset(p_goals) as x(app_id text, text text, done boolean, position int);
  end if;

  -- Snapshot histórico del estado final tal como se guardó
  insert into public.month_snapshots (user_id, year, month, snapshot, source)
  values (v_user_id, p_year, p_month, jsonb_build_object('habits', p_habits, 'days', p_days, 'goals', p_goals), p_source);

  return v_month_id;
end;
$$;

-- ── 3. Backfill: regenerar los 31 días perdidos de julio 2026 ────────────────
-- Reconstruye habit_values con las claves de los 5 hábitos reales de ese mes,
-- igual que buildBlankMonth (src/data.ts): 0 para check/numeric, '' para text-check.
DO $$
DECLARE
  v_month_id uuid;
  v_user_id text := 'user_3FlwR4PfIg9HzcndBMJPRn6aK15';
BEGIN
  SELECT id INTO v_month_id FROM public.months
  WHERE user_id = v_user_id AND year = 2026 AND month = 6; -- julio = índice 6 (0-based)

  IF v_month_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.days WHERE month_id = v_month_id) THEN
    INSERT INTO public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
    SELECT
      v_month_id,
      v_user_id,
      d,
      extract(dow from make_date(2026, 7, d))::int,
      CASE WHEN extract(dow from make_date(2026, 7, d))::int IN (0, 6) THEN 'holiday' ELSE 'work' END,
      '',
      false,
      (SELECT jsonb_object_agg(h.app_id, CASE WHEN h.type = 'text-check' THEN '""'::jsonb ELSE '0'::jsonb END)
       FROM public.habits h WHERE h.month_id = v_month_id)
    FROM generate_series(1, 31) AS d;

    INSERT INTO public.month_snapshots (user_id, year, month, snapshot, source)
    SELECT
      v_user_id, 2026, 6,
      jsonb_build_object(
        'habits', (SELECT jsonb_agg(to_jsonb(h) - 'id' - 'month_id' - 'user_id') FROM public.habits h WHERE h.month_id = v_month_id),
        'days',   (SELECT jsonb_agg(to_jsonb(d) - 'id' - 'month_id' - 'user_id') FROM public.days d WHERE d.month_id = v_month_id),
        'goals',  '[]'::jsonb
      ),
      'backfill';

    RAISE NOTICE 'Backfill de julio 2026 completado: 31 días insertados para %', v_user_id;
  ELSE
    RAISE NOTICE 'Backfill omitido: mes no encontrado o ya tiene días';
  END IF;
END $$;
