-- ============================================================
-- Osmin — Guarda temporal sobre save_month (cliente antiguo)
--
-- `save_month` es la primitiva «reemplaza el mes entero» que causó las pérdidas
-- de julio y agosto de 2026. La sustituye el API por intención de
-- `supabase-split-write-intents.sql`, pero mientras el cliente nuevo no esté
-- desplegado en todos los dispositivos sigue habiendo clientes antiguos vivos
-- llamándola — incluidas pestañas con un mes en blanco en memoria.
--
-- Esta guarda los protege. SE RETIRA junto con `save_month` en cuanto el
-- despliegue esté verificado (ver supabase-drop-save-month.sql).
--
-- Regla: una sola escritura no puede borrar dos o más anotaciones del diario,
-- ni eliminar dos o más hábitos, ni vaciar los hitos. Ninguna acción real del
-- usuario hace eso — la UI borra hábitos de uno en uno y cada borrado emite su
-- propio guardado. Un cliente con estado fabricado, en cambio, lo hace siempre.
--
-- Una versión anterior de esta guarda solo bloqueaba el payload COMPLETAMENTE
-- vacío, y eso dejaba pasar el caso real: móvil con memoria vieja en el que el
-- usuario edita un solo día. El payload deja de estar vacío y destruía el resto
-- del mes igualmente.
-- ============================================================

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
  v_stored_days int;
  v_stored_habits int;
  v_stored_goals int;
  v_lost_highlights int;
  v_lost_habits int;
begin
  v_user_id := public.clerk_user_id();
  if v_user_id is null then
    raise exception 'save_month: no autenticado';
  end if;

  insert into public.months (user_id, year, month)
  values (v_user_id, p_year, p_month)
  on conflict (user_id, year, month) do nothing
  returning id into v_month_id;

  if v_month_id is null then
    select id into v_month_id from public.months
    where user_id = v_user_id and year = p_year and month = p_month;
  end if;

  select count(*) into v_stored_days   from public.days   where month_id = v_month_id;
  select count(*) into v_stored_habits from public.habits where month_id = v_month_id;
  select count(*) into v_stored_goals  from public.goals  where month_id = v_month_id;

  if v_stored_days > 0 and jsonb_array_length(p_days) = 0 then
    raise exception 'save_month: payload sin dias para %-% (almacenados: %)', p_year, p_month, v_stored_days
      using errcode = 'OSM02';
  end if;

  if v_stored_habits > 0 and jsonb_array_length(p_habits) = 0 then
    raise exception 'save_month: payload sin habitos para %-% (almacenados: %)', p_year, p_month, v_stored_habits
      using errcode = 'OSM02';
  end if;

  -- Anotaciones del diario que esta escritura destruiria
  select count(*) into v_lost_highlights
  from public.days d
  where d.month_id = v_month_id
    and d.highlight <> ''
    and coalesce((
      select x.highlight from jsonb_to_recordset(p_days) as x(day int, highlight text)
      where x.day = d.day
    ), '') = '';

  if v_lost_highlights >= 2 then
    raise exception 'save_month: la escritura borraria % anotaciones del diario de %-%', v_lost_highlights, p_year, p_month
      using errcode = 'OSM02',
            hint = 'Estado del cliente desincronizado. Recarga la aplicacion.';
  end if;

  -- Habitos que esta escritura eliminaria
  select count(*) into v_lost_habits
  from public.habits h
  where h.month_id = v_month_id
    and not exists (
      select 1 from jsonb_to_recordset(p_habits) as x(app_id text)
      where x.app_id = h.app_id
    );

  if v_lost_habits >= 2 then
    raise exception 'save_month: la escritura eliminaria % habitos de %-%', v_lost_habits, p_year, p_month
      using errcode = 'OSM02',
            hint = 'Estado del cliente desincronizado. Recarga la aplicacion.';
  end if;

  if v_stored_goals > 0 and jsonb_array_length(p_goals) = 0 then
    raise exception 'save_month: la escritura borraria los % hitos de %-%', v_stored_goals, p_year, p_month
      using errcode = 'OSM02',
            hint = 'Estado del cliente desincronizado. Recarga la aplicacion.';
  end if;

  -- ── Escritura ─────────────────────────────────────────────────────────────
  if jsonb_array_length(p_days) > 0 then
    delete from public.days where month_id = v_month_id;
    insert into public.days (month_id, user_id, day, weekday, status, highlight, milestone, habit_values)
    select v_month_id, v_user_id, x.day, x.weekday, x.status, x.highlight, x.milestone, x.habit_values
    from jsonb_to_recordset(p_days) as x(
      day int, weekday int, status text, highlight text, milestone boolean, habit_values jsonb
    );
  end if;

  if jsonb_array_length(p_habits) > 0 then
    delete from public.habits where month_id = v_month_id;
    insert into public.habits (month_id, user_id, app_id, label, short, type, color, goal, target_per_week, unit, position)
    select v_month_id, v_user_id, x.app_id, x.label, x.short, x.type, x.color, x.goal, x.target_per_week, x.unit, x.position
    from jsonb_to_recordset(p_habits) as x(
      app_id text, label text, short text, type text, color text,
      goal int, target_per_week int, unit text, position int
    );
  end if;

  delete from public.goals where month_id = v_month_id;
  if jsonb_array_length(p_goals) > 0 then
    insert into public.goals (month_id, user_id, app_id, text, done, position)
    select v_month_id, v_user_id, x.app_id, x.text, x.done, x.position
    from jsonb_to_recordset(p_goals) as x(app_id text, text text, done boolean, position int);
  end if;

  insert into public.month_snapshots (user_id, year, month, snapshot, source)
  values (v_user_id, p_year, p_month, jsonb_build_object('habits', p_habits, 'days', p_days, 'goals', p_goals), p_source);

  return v_month_id;
end;
$$;
