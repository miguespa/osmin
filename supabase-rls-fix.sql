-- ============================================================
-- Osmin — RLS fix: recreate all policies with explicit WITH CHECK
-- Ejecuta este bloque completo en el SQL Editor de Supabase
-- ============================================================

-- ── Función más robusta para obtener el Clerk user ID ────────────────────────
create or replace function auth.clerk_user_id()
returns text
language sql stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- ── Recrear todas las políticas con WITH CHECK explícito ─────────────────────
drop policy if exists "own months"   on months;
drop policy if exists "own habits"   on habits;
drop policy if exists "own days"     on days;
drop policy if exists "own goals"    on goals;
drop policy if exists "own tweaks"   on tweaks;
drop policy if exists "own ui_state" on ui_state;

create policy "own months" on months
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

create policy "own habits" on habits
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

create policy "own days" on days
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

create policy "own goals" on goals
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

create policy "own tweaks" on tweaks
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

create policy "own ui_state" on ui_state
  for all
  using      (user_id = auth.clerk_user_id())
  with check (user_id = auth.clerk_user_id());

-- ── Test: llama a esto desde el SQL Editor para ver el JWT activo ────────────
-- (solo funciona cuando hay una sesión activa; en el editor devuelve null)
-- select auth.clerk_user_id();
-- select auth.jwt();
