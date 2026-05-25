-- ============================================================
-- Osmin — Supabase SQL migration
-- Pega este bloque completo en el SQL Editor de Supabase
-- ============================================================
--
-- ANTES de ejecutar, configura la autenticación Clerk → Supabase:
--
-- Opción A (recomendada — Third-party Auth):
--   1. Supabase Dashboard → Authentication → Sign In / Up → Third-party Auth → Add provider → Custom OIDC
--   2. Issuer URL: https://clerk.YOUR_DOMAIN.lcl.dev  (o el dominio de tu app en Clerk)
--   3. En Clerk Dashboard → Configure → JWT Templates → New → "supabase"
--      → Claims: { "role": "authenticated" }  (Clerk añade sub, iss, aud automáticamente)
--
-- Opción B (shared secret):
--   1. Supabase Dashboard → Project Settings → API → JWT Secret  (cópialo)
--   2. Clerk Dashboard → JWT Templates → New → "supabase" → pega el JWT Secret de Supabase
--
-- En ambos casos el user_id en RLS será el Clerk user.id (claim "sub").
-- ============================================================

-- ── Helper: extrae user_id del JWT ────────────────────────────────────────────
create or replace function auth.clerk_user_id()
returns text
language sql stable
as $$
  select nullif(
    coalesce(auth.jwt() ->> 'sub', current_setting('request.jwt.claims', true)::json ->> 'sub'),
    ''
  )::text;
$$;

-- ── Tabla: months ─────────────────────────────────────────────────────────────
create table if not exists months (
  id       uuid    primary key default gen_random_uuid(),
  user_id  text    not null,
  year     int     not null,
  month    int     not null,   -- 0 = enero … 11 = diciembre
  created_at timestamptz default now(),
  constraint months_user_year_month unique (user_id, year, month)
);

-- ── Tabla: habits ─────────────────────────────────────────────────────────────
create table if not exists habits (
  id              uuid    primary key default gen_random_uuid(),
  month_id        uuid    not null references months(id) on delete cascade,
  user_id         text    not null,
  app_id          text    not null,   -- ID que usa la app (h1, h2, timestamp…)
  label           text    not null,
  short           text    not null,
  type            text    not null check (type in ('check', 'numeric')),
  color           text    not null,
  goal            int,
  target_per_week int,
  unit            text,
  position        int     not null default 0,
  constraint habits_month_app_id unique (month_id, app_id)
);

-- ── Tabla: days ───────────────────────────────────────────────────────────────
create table if not exists days (
  id           uuid    primary key default gen_random_uuid(),
  month_id     uuid    not null references months(id) on delete cascade,
  user_id      text    not null,
  day          int     not null,
  weekday      int     not null,
  status       text    not null default 'work',
  highlight    text    not null default '',
  milestone    boolean not null default false,
  habit_values jsonb   not null default '{}',
  constraint days_month_day unique (month_id, day)
);

-- ── Tabla: goals ──────────────────────────────────────────────────────────────
create table if not exists goals (
  id       uuid    primary key default gen_random_uuid(),
  month_id uuid    not null references months(id) on delete cascade,
  user_id  text    not null,
  app_id   text    not null,
  text     text    not null,
  done     boolean not null default false,
  position int     not null default 0,
  constraint goals_month_app_id unique (month_id, app_id)
);

-- ── Tabla: tweaks (preferencias visuales por usuario) ────────────────────────
create table if not exists tweaks (
  user_id  text    primary key,
  theme    text    not null default 'dark',
  density  text    not null default 'compact',
  accent   text    not null default '#2A6FDB',
  updated_at timestamptz default now()
);

-- ── Tabla: ui_state (mes activo, layout) ─────────────────────────────────────
create table if not exists ui_state (
  user_id      text    primary key,
  active_year  int,
  active_month int,
  layout       text    not null default 'table',
  updated_at   timestamptz default now()
);

-- ── Índices de rendimiento ────────────────────────────────────────────────────
create index if not exists idx_months_user_id     on months(user_id);
create index if not exists idx_habits_month_id    on habits(month_id);
create index if not exists idx_days_month_id      on days(month_id);
create index if not exists idx_goals_month_id     on goals(month_id);

-- ── Row Level Security ────────────────────────────────────────────────────────
alter table months   enable row level security;
alter table habits   enable row level security;
alter table days     enable row level security;
alter table goals    enable row level security;
alter table tweaks   enable row level security;
alter table ui_state enable row level security;

-- Policies: cada usuario solo accede a sus propios datos
create policy "own months"   on months   for all using (user_id = auth.clerk_user_id());
create policy "own habits"   on habits   for all using (user_id = auth.clerk_user_id());
create policy "own days"     on days     for all using (user_id = auth.clerk_user_id());
create policy "own goals"    on goals    for all using (user_id = auth.clerk_user_id());
create policy "own tweaks"   on tweaks   for all using (user_id = auth.clerk_user_id());
create policy "own ui_state" on ui_state for all using (user_id = auth.clerk_user_id());
