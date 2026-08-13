-- ============================================================
-- Osmin — Fijar el search_path de clerk_user_id()
--
-- `clerk_user_id()` es la pieza de la que dependen LAS NUEVE politicas RLS
-- (months, days, habits, goals, tweaks, ui_state, users, login_events,
-- month_snapshots). Sin `search_path` fijado, su resolucion de nombres depende
-- del search_path de quien la llama.
--
-- `auth.jwt()` ya va cualificada por esquema y `nullif` vive en `pg_catalog`
-- (siempre implicito), asi que fijarlo a vacio no cambia el comportamiento.
--
-- Verificado tras aplicarlo, con roles simulados:
--   yo_veo_mis_meses=3    yo_veo_meses_ajenos=0
--   otro_ve_sus_meses=1   otro_ve_mis_meses=0
--   sin_jwt_ve_meses=0    anon_ve_meses=0
-- ============================================================

create or replace function public.clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $function$
  select nullif(auth.jwt() ->> 'sub', '');
$function$;
