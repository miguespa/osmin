-- ============================================================
-- Osmin — RESET COMPLETO: borra todo y recrea desde cero
-- Pega este bloque en Supabase → SQL Editor → Run
-- ============================================================

-- ── 1. Borrar todo lo anterior ────────────────────────────────────────────────
drop table if exists public.login_events cascade;
drop table if exists public.users        cascade;
drop table if exists public.goals        cascade;
drop table if exists public.days         cascade;
drop table if exists public.habits       cascade;
drop table if exists public.months       cascade;
drop table if exists public.tweaks       cascade;
drop table if exists public.ui_state     cascade;

drop function if exists auth.clerk_user_id();

-- ── 2. Función para leer el Clerk user ID del JWT ────────────────────────────
create or replace function auth.clerk_user_id()
returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- ── 3. Tablas ─────────────────────────────────────────────────────────────────
create table public.months (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  year       int         not null,
  month      int         not null,
  created_at timestamptz default now(),
  constraint months_user_year_month unique (user_id, year, month)
);

create table public.habits (
  id              uuid primary key default gen_random_uuid(),
  month_id        uuid not null references public.months(id) on delete cascade,
  user_id         text not null,
  app_id          text not null,
  label           text not null,
  short           text not null,
  type            text not null check (type in ('check', 'numeric')),
  color           text not null,
  goal            int,
  target_per_week int,
  unit            text,
  position        int  not null default 0,
  constraint habits_month_app_id unique (month_id, app_id)
);

create table public.days (
  id           uuid    primary key default gen_random_uuid(),
  month_id     uuid    not null references public.months(id) on delete cascade,
  user_id      text    not null,
  day          int     not null,
  weekday      int     not null,
  status       text    not null default 'work',
  highlight    text    not null default '',
  milestone    boolean not null default false,
  habit_values jsonb   not null default '{}',
  constraint days_month_day unique (month_id, day)
);

create table public.goals (
  id       uuid    primary key default gen_random_uuid(),
  month_id uuid    not null references public.months(id) on delete cascade,
  user_id  text    not null,
  app_id   text    not null,
  text     text    not null,
  done     boolean not null default false,
  position int     not null default 0,
  constraint goals_month_app_id unique (month_id, app_id)
);

create table public.tweaks (
  user_id    text        primary key,
  theme      text        not null default 'dark',
  density    text        not null default 'compact',
  accent     text        not null default '#2A6FDB',
  updated_at timestamptz default now()
);

create table public.ui_state (
  user_id      text        primary key,
  active_year  int,
  active_month int,
  layout       text        not null default 'table',
  updated_at   timestamptz default now()
);

create table public.users (
  id               text        primary key,
  email            text        not null,
  first_name       text,
  last_name        text,
  image_url        text,
  clerk_created_at timestamptz,
  last_seen_at     timestamptz default now(),
  created_at       timestamptz default now()
);

create table public.login_events (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null references public.users(id) on delete cascade,
  logged_at  timestamptz default now(),
  user_agent text
);

-- ── 4. Índices ────────────────────────────────────────────────────────────────
create index idx_months_user_id      on public.months(user_id);
create index idx_habits_month_id     on public.habits(month_id);
create index idx_days_month_id       on public.days(month_id);
create index idx_goals_month_id      on public.goals(month_id);
create index idx_login_events_user   on public.login_events(user_id);
create index idx_login_events_date   on public.login_events(logged_at desc);

-- ── 5. Row Level Security ─────────────────────────────────────────────────────
alter table public.months       enable row level security;
alter table public.habits       enable row level security;
alter table public.days         enable row level security;
alter table public.goals        enable row level security;
alter table public.tweaks       enable row level security;
alter table public.ui_state     enable row level security;
alter table public.users        enable row level security;
alter table public.login_events enable row level security;

create policy "own months" on public.months for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own habits" on public.habits for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own days" on public.days for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own goals" on public.goals for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own tweaks" on public.tweaks for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own ui_state" on public.ui_state for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());

create policy "own user row" on public.users for all
  using (id = auth.clerk_user_id()) with check (id = auth.clerk_user_id());

create policy "own login_events" on public.login_events for all
  using (user_id = auth.clerk_user_id()) with check (user_id = auth.clerk_user_id());
