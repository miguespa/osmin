-- ============================================================
-- Osmin — Tablas de usuarios y eventos de login
-- Ejecuta este bloque completo en el SQL Editor de Supabase
-- ============================================================

-- ── Tabla: users (sincronizada desde Clerk en cada login) ────────────────────
create table if not exists public.users (
  id          text        primary key,           -- Clerk user ID (user_2abc...)
  email       text        not null,
  first_name  text,
  last_name   text,
  image_url   text,
  clerk_created_at  timestamptz,                 -- fecha de alta en Clerk
  last_seen_at      timestamptz default now(),   -- última vez que abrió la app
  created_at        timestamptz default now()    -- primera vez en esta tabla
);

-- ── Tabla: login_events (un registro por sesión iniciada) ────────────────────
create table if not exists public.login_events (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null references public.users(id) on delete cascade,
  logged_at   timestamptz default now(),
  user_agent  text
);

-- Índices
create index if not exists idx_login_events_user_id  on public.login_events(user_id);
create index if not exists idx_login_events_logged_at on public.login_events(logged_at desc);

-- ── RLS ───────────────────────────────────────────────────────────────────────
alter table public.users        enable row level security;
alter table public.login_events enable row level security;

-- users: cada usuario gestiona su propia fila
create policy "users: own row"
  on public.users for all
  using      (id = auth.clerk_user_id())
  with check (id = auth.clerk_user_id());

-- login_events: cada usuario ve e inserta sus propios eventos
create policy "login_events: own rows"
  on public.login_events for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

-- ── Vista de administración (opcional, solo desde Supabase Studio) ───────────
-- Desde el dashboard de Supabase puedes ver todos los datos directamente.
-- Para una consulta rápida de actividad:
--
-- select u.email, u.first_name, u.last_name, u.clerk_created_at,
--        count(l.id) as total_logins,
--        max(l.logged_at) as ultimo_login
-- from public.users u
-- left join public.login_events l on l.user_id = u.id
-- group by u.id
-- order by ultimo_login desc;
