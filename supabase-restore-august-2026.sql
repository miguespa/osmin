-- ============================================================
-- Osmin — Rescate de agosto 2026 (cuenta miguelespadaruiz@gmail.com)
--
-- Incidencia (13-ago-2026, probada en edge_logs):
--   18:30:49.984  GET /rest/v1/months → 401 (token de Clerk caducado)
--   18:30:49→53   fetchAllData lanza → App.tsx pone en el estado
--                 [buildBlankMonth(hoy)] con los 3 hábitos por defecto
--   18:30:53.051  el autoguardado debounced persiste ese mes en blanco
--                 vía rpc/save_month → 200
--
-- El guardado atómico funcionó: escribió basura de forma impecable. Lo que
-- falla es que el cliente fabrica estado cuando la carga falla y lo persiste.
--
-- Este script restaura el último estado bueno desde month_snapshots
-- (2026-08-13 15:38:15.19072+00 — 31 días, 5 hábitos, 3 hitos, 8 highlights).
-- Los snapshots posteriores (18:31, 18:48) ya están en blanco, así que
-- elegir ese punto no descarta ningún dato posterior del usuario.
--
-- Idempotente y reversible: deja snapshot pre-imagen antes de tocar nada.
-- ============================================================

DO $$
DECLARE
  v_user_id  text := 'user_3FlwR4PfIg9HzcndBMJPRn6aK15';
  v_year     int  := 2026;
  v_month    int  := 7;   -- agosto = índice 7 (0-based, igual que Date.getMonth())
  v_good_at  timestamptz := '2026-08-13 15:38:15.19072+00';
  v_month_id uuid;
  v_snapshot jsonb;
  v_days int; v_habits int; v_goals int;
BEGIN
  SELECT id INTO v_month_id FROM public.months
  WHERE user_id = v_user_id AND year = v_year AND month = v_month;

  IF v_month_id IS NULL THEN
    RAISE EXCEPTION 'No existe el mes %-% para %', v_year, v_month, v_user_id;
  END IF;

  SELECT snapshot INTO v_snapshot FROM public.month_snapshots
  WHERE user_id = v_user_id AND year = v_year AND month = v_month
    AND created_at = v_good_at;

  IF v_snapshot IS NULL THEN
    RAISE EXCEPTION 'No se encuentra el snapshot bueno de % para %', v_good_at, v_user_id;
  END IF;

  -- ── Snapshot pre-imagen: la propia restauración es reversible ──────────────
  INSERT INTO public.month_snapshots (user_id, year, month, snapshot, source)
  SELECT v_user_id, v_year, v_month,
    jsonb_build_object(
      'habits', coalesce((SELECT jsonb_agg(to_jsonb(h) - 'id' - 'month_id' - 'user_id' ORDER BY h.position)
                          FROM public.habits h WHERE h.month_id = v_month_id), '[]'::jsonb),
      'days',   coalesce((SELECT jsonb_agg(to_jsonb(d) - 'id' - 'month_id' - 'user_id' ORDER BY d.day)
                          FROM public.days d WHERE d.month_id = v_month_id), '[]'::jsonb),
      'goals',  coalesce((SELECT jsonb_agg(to_jsonb(g) - 'id' - 'month_id' - 'user_id' ORDER BY g.position)
                          FROM public.goals g WHERE g.month_id = v_month_id), '[]'::jsonb)
    ),
    'pre-restore';

  -- ── Reemplazo del contenido del mes ───────────────────────────────────────
  DELETE FROM public.days   WHERE month_id = v_month_id;
  DELETE FROM public.habits WHERE month_id = v_month_id;
  DELETE FROM public.goals  WHERE month_id = v_month_id;

  INSERT INTO public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
  SELECT v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
  FROM jsonb_to_recordset(v_snapshot->'habits') AS x(
    app_id text, label text, short text, type text, color text,
    goal int, target_per_week int, unit text, position int
  );

  INSERT INTO public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
  SELECT v_month_id, v_user_id, x.day, x.weekday, x.status, x.highlight, x.milestone, x.habit_values
  FROM jsonb_to_recordset(v_snapshot->'days') AS x(
    day int, weekday int, status text, highlight text, milestone boolean, habit_values jsonb
  );

  INSERT INTO public.goals (month_id, user_id, app_id, text, done, position)
  SELECT v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
  FROM jsonb_to_recordset(v_snapshot->'goals') AS x(app_id text, text text, done boolean, position int);

  -- ── Snapshot post-restauración ────────────────────────────────────────────
  INSERT INTO public.month_snapshots (user_id, year, month, snapshot, source)
  VALUES (v_user_id, v_year, v_month, v_snapshot, 'restore');

  SELECT count(*) INTO v_days   FROM public.days   WHERE month_id = v_month_id;
  SELECT count(*) INTO v_habits FROM public.habits WHERE month_id = v_month_id;
  SELECT count(*) INTO v_goals  FROM public.goals  WHERE month_id = v_month_id;
  RAISE NOTICE 'Agosto 2026 restaurado: % días, % hábitos, % hitos', v_days, v_habits, v_goals;
END $$;
