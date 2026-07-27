-- ============================================================
-- Osmin — Fix schema for PostgREST 12 compatibility
-- PostgREST 12 requires PRIMARY KEY on every table used for mutations.
-- If your tables were created with an older schema (CREATE TABLE IF NOT EXISTS
-- skips constraints when the table already exists), run this to patch them.
--
-- Pega este bloque en el SQL Editor de Supabase y ejecútalo.
-- ============================================================

-- ── months ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'months_pkey' AND conrelid = 'months'::regclass
  ) THEN
    ALTER TABLE months ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to months.id';
  ELSE
    RAISE NOTICE 'months already has a PRIMARY KEY — skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'months_user_year_month'
  ) THEN
    ALTER TABLE months ADD CONSTRAINT months_user_year_month UNIQUE (user_id, year, month);
    RAISE NOTICE 'Added UNIQUE constraint months_user_year_month';
  ELSE
    RAISE NOTICE 'months_user_year_month already exists — skipping';
  END IF;
END $$;

-- ── habits ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'habits_pkey' AND conrelid = 'habits'::regclass
  ) THEN
    ALTER TABLE habits ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to habits.id';
  ELSE
    RAISE NOTICE 'habits already has a PRIMARY KEY — skipping';
  END IF;
END $$;

-- ── days ─────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'days_pkey' AND conrelid = 'days'::regclass
  ) THEN
    ALTER TABLE days ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to days.id';
  ELSE
    RAISE NOTICE 'days already has a PRIMARY KEY — skipping';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'days_month_day'
  ) THEN
    ALTER TABLE days ADD CONSTRAINT days_month_day UNIQUE (month_id, day);
    RAISE NOTICE 'Added UNIQUE constraint days_month_day';
  ELSE
    RAISE NOTICE 'days_month_day already exists — skipping';
  END IF;
END $$;

-- ── goals ────────────────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'goals_pkey' AND conrelid = 'goals'::regclass
  ) THEN
    ALTER TABLE goals ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to goals.id';
  ELSE
    RAISE NOTICE 'goals already has a PRIMARY KEY — skipping';
  END IF;
END $$;

-- ── tweaks / ui_state ────────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tweaks_pkey' AND conrelid = 'tweaks'::regclass
  ) THEN
    ALTER TABLE tweaks ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to tweaks.id';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ui_state_pkey' AND conrelid = 'ui_state'::regclass
  ) THEN
    ALTER TABLE ui_state ADD PRIMARY KEY (id);
    RAISE NOTICE 'Added PRIMARY KEY to ui_state.id';
  END IF;
END $$;

-- ── Diagnóstico: qué tablas no tienen PK ─────────────────────────────────────
-- (no hace cambios, solo muestra el estado actual)
SELECT
  t.table_name,
  CASE WHEN pk.constraint_name IS NOT NULL THEN 'tiene PK ✓' ELSE 'SIN PK ✗' END AS pk_status
FROM information_schema.tables t
LEFT JOIN (
  SELECT tc.table_name, tc.constraint_name
  FROM information_schema.table_constraints tc
  WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
) pk ON pk.table_name = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;
