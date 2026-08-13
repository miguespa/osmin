-- ============================================================
-- Osmin — Separación de las escrituras por intención
--
-- Causa raíz de las dos pérdidas de datos (julio y agosto de 2026): existía
-- una única primitiva de escritura, `save_month`, que significaba «reemplaza
-- el mes entero por este payload». Marcar el gimnasio del día 4 reescribía los
-- 31 días, los hábitos y los hitos. Por eso cualquier corrupción del estado en
-- memoria del cliente — un mes en blanco fabricado tras un 401 en la carga —
-- se traducía en la destrucción total del mes.
--
-- Este script sustituye esa primitiva por operaciones con intención explícita:
--
--   create_month  crear un mes (SOLO inserta; si ya existe, falla)
--   save_day      escribir UN día
--   save_habits   reemplazar el conjunto de hábitos del mes
--   save_goals    reemplazar el conjunto de hitos del mes
--   delete_month  borrar un mes (deja copia antes)
--   restore_month_snapshot  restaurar un punto del histórico
--
-- Consecuencias:
--   · Un mes en blanco no puede sobrescribir un mes existente: lo rechaza
--     Postgres, no la memoria del cliente.
--   · El radio de daño de escribir un día es ese día.
--   · Las operaciones destructivas (hábitos/hitos) llevan control de
--     concurrencia optimista vía months.revision; las de día no lo necesitan,
--     resuelven por última-escritura-gana a nivel de día.
--
-- Códigos de error:
--   OSM01  el mes ya existe / no existe (según la operación)
--   OSM02  escritura en blanco bloqueada
--   OSM03  revisión obsoleta: recarga y reintenta
-- ============================================================

-- ── 1. Revisión por mes (concurrencia optimista) ─────────────────────────────
alter table public.months add column if not exists revision bigint not null default 1;

-- ── 2. Helper: snapshot del estado actual, con estrangulamiento opcional ─────
-- Las operaciones estructurales (crear, hábitos, hitos, borrar, restaurar)
-- siempre dejan copia. Las escrituras de día, como mucho una cada 15 minutos:
-- con escrituras dirigidas el riesgo por escritura es mínimo y no tiene sentido
-- una copia completa del mes por cada casilla marcada.
create or replace function public.snapshot_month(
  p_user_id text,
  p_month_id uuid,
  p_year int,
  p_month int,
  p_source text,
  p_throttle_minutes int default 0
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if p_throttle_minutes > 0 and exists (
    select 1 from public.month_snapshots
    where user_id = p_user_id and year = p_year and month = p_month
      and created_at > now() - make_interval(mins => p_throttle_minutes)
  ) then
    return;
  end if;

  insert into public.month_snapshots (user_id, year, month, snapshot, source)
  values (
    p_user_id, p_year, p_month,
    jsonb_build_object(
      'habits', coalesce((select jsonb_agg(to_jsonb(h) - 'id' - 'month_id' - 'user_id' order by h.position)
                          from public.habits h where h.month_id = p_month_id), '[]'::jsonb),
      'days',   coalesce((select jsonb_agg(to_jsonb(d) - 'id' - 'month_id' - 'user_id' order by d.day)
                          from public.days d where d.month_id = p_month_id), '[]'::jsonb),
      'goals',  coalesce((select jsonb_agg(to_jsonb(g) - 'id' - 'month_id' - 'user_id' order by g.position)
                          from public.goals g where g.month_id = p_month_id), '[]'::jsonb)
    ),
    p_source
  );
end;
$$;

-- ── 3. Helper interno: resolver el mes del usuario autenticado ───────────────
create or replace function public.require_month(p_year int, p_month int)
returns TABLE (user_id text, month_id uuid, revision bigint)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
begin
  v_user_id := public.clerk_user_id();
  if v_user_id is null then
    raise exception 'no autenticado' using errcode = 'OSM01';
  end if;

  return query
    select m.user_id, m.id, m.revision from public.months m
    where m.user_id = v_user_id and m.year = p_year and m.month = p_month;

  if not found then
    raise exception 'el mes %-% no existe para este usuario', p_year, p_month
      using errcode = 'OSM01',
            hint = 'La edición de un día nunca crea el mes: eso es responsabilidad del flujo de creación.';
  end if;
end;
$$;

-- ── 4. create_month — la ÚNICA operación que escribe un mes completo ─────────
-- Solo inserta. Si el mes ya existe falla con OSM01: un estado fabricado por el
-- cliente (p. ej. tras un fallo de carga) no puede sobrescribir datos reales.
-- Los días los genera el servidor a partir de year/month, con las mismas reglas
-- que buildBlankMonth (src/data.ts): dow 0/6 → 'holiday', resto 'work'.
create or replace function public.create_month(
  p_year int,
  p_month int,
  p_habits jsonb,
  p_goals jsonb default '[]'::jsonb
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
    raise exception 'no autenticado' using errcode = 'OSM01';
  end if;

  if jsonb_array_length(p_habits) = 0 then
    raise exception 'create_month: un mes nuevo necesita al menos un hábito'
      using errcode = 'OSM02';
  end if;

  insert into public.months (user_id, year, month)
  values (v_user_id, p_year, p_month)
  on conflict (user_id, year, month) do nothing
  returning id into v_month_id;

  if v_month_id is null then
    raise exception 'create_month: el mes %-% ya existe', p_year, p_month
      using errcode = 'OSM01',
            hint = 'Crear un mes nunca sobrescribe. Recarga los datos del servidor.';
  end if;

  insert into public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
  select v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
  from jsonb_to_recordset(p_habits) as x(
    app_id text, label text, short text, type text, color text,
    goal int, target_per_week int, unit text, position int
  );

  insert into public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
  select
    v_month_id, v_user_id, d,
    extract(dow from make_date(p_year, p_month + 1, d))::int,
    case when extract(dow from make_date(p_year, p_month + 1, d))::int in (0, 6) then 'holiday' else 'work' end,
    '', false,
    coalesce((select jsonb_object_agg(h.app_id, case when h.type = 'text-check' then '""'::jsonb else '0'::jsonb end)
              from public.habits h where h.month_id = v_month_id), '{}'::jsonb)
  from generate_series(1, extract(day from (make_date(p_year, p_month + 1, 1) + interval '1 month - 1 day'))::int) as d;

  if jsonb_array_length(p_goals) > 0 then
    insert into public.goals (month_id, user_id, app_id, text, done, position)
    select v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
    from jsonb_to_recordset(p_goals) as x(app_id text, text text, done boolean, position int);
  end if;

  perform public.snapshot_month(v_user_id, v_month_id, p_year, p_month, 'create');
  return v_month_id;
end;
$$;

-- ── 5. save_day — escribe UN día. No puede tocar nada más ────────────────────
create or replace function public.save_day(
  p_year int,
  p_month int,
  p_day int,
  p_weekday int,
  p_status text,
  p_highlight text,
  p_milestone boolean,
  p_habit_values jsonb
) returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
  v_rev bigint;
begin
  select r.user_id, r.month_id, r.revision into v_user_id, v_month_id, v_rev
  from public.require_month(p_year, p_month) r;

  perform public.snapshot_month(v_user_id, v_month_id, p_year, p_month, 'day-edit', 15);

  insert into public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
  values (v_month_id, v_user_id, p_day, p_weekday, p_status, p_highlight, p_milestone, p_habit_values)
  on conflict (month_id, day) do update set
    weekday      = excluded.weekday,
    status       = excluded.status,
    highlight    = excluded.highlight,
    milestone    = excluded.milestone,
    habit_values = excluded.habit_values;
end;
$$;

-- ── 6. save_habits — reemplaza el conjunto de hábitos del mes ────────────────
-- Operación destructiva → control de concurrencia optimista + guarda anti-vaciado.
-- Al quitar un hábito, purga su clave de habit_values en todos los días, cosa
-- que antes hacía el cliente en memoria y se persistía reescribiendo el mes entero.
create or replace function public.save_habits(
  p_year int,
  p_month int,
  p_habits jsonb,
  p_base_revision bigint default null
) returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
  v_rev bigint;
  v_new_rev bigint;
begin
  select r.user_id, r.month_id, r.revision into v_user_id, v_month_id, v_rev
  from public.require_month(p_year, p_month) r;

  if jsonb_array_length(p_habits) = 0 then
    raise exception 'save_habits: un mes no puede quedarse sin hábitos'
      using errcode = 'OSM02';
  end if;

  if p_base_revision is not null and p_base_revision <> v_rev then
    raise exception 'save_habits: revisión obsoleta (tienes %, el servidor va por %)', p_base_revision, v_rev
      using errcode = 'OSM03', hint = 'Recarga el mes y reintenta.';
  end if;

  perform public.snapshot_month(v_user_id, v_month_id, p_year, p_month, 'habits-edit');

  delete from public.habits h
  where h.month_id = v_month_id
    and not exists (
      select 1 from jsonb_to_recordset(p_habits) as x(app_id text)
      where x.app_id = h.app_id
    );

  insert into public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
  select v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
  from jsonb_to_recordset(p_habits) as x(
    app_id text, label text, short text, type text, color text,
    goal int, target_per_week int, unit text, position int
  )
  on conflict (month_id, app_id) do update set
    label = excluded.label, short = excluded.short, type = excluded.type,
    color = excluded.color, goal = excluded.goal,
    target_per_week = excluded.target_per_week, unit = excluded.unit,
    position = excluded.position;

  -- Sincroniza las claves de habit_values con el conjunto de hábitos vigente:
  -- quita las de los hábitos borrados y añade las de los nuevos con su valor
  -- inicial. Nunca toca el valor de un hábito que ya existía.
  update public.days d
  set habit_values = (
    select coalesce(jsonb_object_agg(
             h.app_id,
             coalesce(d.habit_values -> h.app_id,
                      case when h.type = 'text-check' then '""'::jsonb else '0'::jsonb end)
           ), '{}'::jsonb)
    from public.habits h where h.month_id = v_month_id
  )
  where d.month_id = v_month_id;

  update public.months set revision = revision + 1
  where id = v_month_id returning revision into v_new_rev;

  return v_new_rev;
end;
$$;

-- ── 7. save_goals — reemplaza el conjunto de hitos del mes ───────────────────
create or replace function public.save_goals(
  p_year int,
  p_month int,
  p_goals jsonb,
  p_base_revision bigint default null
) returns bigint
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
  v_rev bigint;
  v_new_rev bigint;
begin
  select r.user_id, r.month_id, r.revision into v_user_id, v_month_id, v_rev
  from public.require_month(p_year, p_month) r;

  if p_base_revision is not null and p_base_revision <> v_rev then
    raise exception 'save_goals: revisión obsoleta (tienes %, el servidor va por %)', p_base_revision, v_rev
      using errcode = 'OSM03', hint = 'Recarga el mes y reintenta.';
  end if;

  perform public.snapshot_month(v_user_id, v_month_id, p_year, p_month, 'goals-edit');

  delete from public.goals g
  where g.month_id = v_month_id
    and not exists (
      select 1 from jsonb_to_recordset(p_goals) as x(app_id text)
      where x.app_id = g.app_id
    );

  if jsonb_array_length(p_goals) > 0 then
    insert into public.goals (month_id, user_id, app_id, text, done, position)
    select v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
    from jsonb_to_recordset(p_goals) as x(app_id text, text text, done boolean, position int)
    on conflict (month_id, app_id) do update set
      text = excluded.text, done = excluded.done, position = excluded.position;
  end if;

  update public.months set revision = revision + 1
  where id = v_month_id returning revision into v_new_rev;

  return v_new_rev;
end;
$$;

-- ── 8. delete_month — borra dejando copia recuperable ────────────────────────
create or replace function public.delete_month(p_year int, p_month int)
returns void
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
  v_rev bigint;
begin
  select r.user_id, r.month_id, r.revision into v_user_id, v_month_id, v_rev
  from public.require_month(p_year, p_month) r;

  perform public.snapshot_month(v_user_id, v_month_id, p_year, p_month, 'pre-delete');
  delete from public.months where id = v_month_id;
end;
$$;

-- ── 9. restore_month_snapshot — recuperación autoservicio ────────────────────
create or replace function public.restore_month_snapshot(p_snapshot_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id text;
  v_month_id uuid;
  v_snap record;
begin
  v_user_id := public.clerk_user_id();
  if v_user_id is null then
    raise exception 'no autenticado' using errcode = 'OSM01';
  end if;

  select * into v_snap from public.month_snapshots
  where id = p_snapshot_id and user_id = v_user_id;

  if v_snap is null then
    raise exception 'restore_month_snapshot: copia no encontrada' using errcode = 'OSM01';
  end if;

  insert into public.months (user_id, year, month)
  values (v_user_id, v_snap.year, v_snap.month)
  on conflict (user_id, year, month) do nothing
  returning id into v_month_id;

  if v_month_id is null then
    select id into v_month_id from public.months
    where user_id = v_user_id and year = v_snap.year and month = v_snap.month;
    perform public.snapshot_month(v_user_id, v_month_id, v_snap.year, v_snap.month, 'pre-restore');
  end if;

  delete from public.days   where month_id = v_month_id;
  delete from public.habits where month_id = v_month_id;
  delete from public.goals  where month_id = v_month_id;

  insert into public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
  select v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
  from jsonb_to_recordset(v_snap.snapshot->'habits') as x(
    app_id text, label text, short text, type text, color text,
    goal int, target_per_week int, unit text, position int
  );

  insert into public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
  select v_month_id, v_user_id, x.day, x.weekday, x.status, x.highlight, x.milestone, x.habit_values
  from jsonb_to_recordset(v_snap.snapshot->'days') as x(
    day int, weekday int, status text, highlight text, milestone boolean, habit_values jsonb
  );

  insert into public.goals (month_id, user_id, app_id, text, done, position)
  select v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
  from jsonb_to_recordset(coalesce(v_snap.snapshot->'goals', '[]'::jsonb)) as x(
    app_id text, text text, done boolean, position int
  );

  update public.months set revision = revision + 1 where id = v_month_id;
  perform public.snapshot_month(v_user_id, v_month_id, v_snap.year, v_snap.month, 'restore');
  return v_month_id;
end;
$$;

-- ── 10. Poda del histórico ───────────────────────────────────────────────────
-- Conserva todo lo de los últimos 7 días y la última copia de cada día durante
-- 90. Sin esto la tabla crece sin límite (160 filas para una sola cuenta de prueba).
create or replace function public.prune_month_snapshots()
returns int
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_deleted int;
begin
  with keep as (
    (select id from public.month_snapshots where created_at > now() - interval '7 days')
    union
    (select distinct on (user_id, year, month, created_at::date) id
     from public.month_snapshots
     where created_at > now() - interval '90 days'
     order by user_id, year, month, created_at::date, created_at desc)
  )
  delete from public.month_snapshots s
  where s.id not in (select id from keep) and s.source not in ('pre-delete', 'pre-restore');
  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;
