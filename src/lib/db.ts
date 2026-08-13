import type { SupabaseClient } from './supabase'
import type { Month, Habit, Day, Goal, Tweaks, LayoutType } from '../types'

// ── Types for DB rows ─────────────────────────────────────────────────────────
interface DbMonth   extends Record<string, unknown> { id: string; year: number; month: number; revision: number }
interface DbHabit   extends Record<string, unknown> { month_id: string; app_id: string; label: string; short: string; type: string; color: string; goal: number | null; target_per_week: number | null; unit: string | null; position: number }
interface DbDay     extends Record<string, unknown> { month_id: string; day: number; weekday: number; status: string; highlight: string; milestone: boolean; habit_values: Record<string, number | string> }
interface DbGoal    extends Record<string, unknown> { month_id: string; app_id: string; text: string; done: boolean; position: number }
interface DbTweaks  { theme: string; density: string; accent: string }
interface DbUiState { active_year: number | null; active_month: number | null; layout: string }

// ── Códigos de error del API de escritura (supabase-split-write-intents.sql) ──
export const ERR_CONFLICT = 'OSM01' // el mes ya existe / no existe
export const ERR_REFUSED  = 'OSM02' // escritura destructiva rechazada
export const ERR_STALE    = 'OSM03' // revisión obsoleta: recarga y reintenta

interface PostgresError { code?: string; message: string }

export function errorCode(err: unknown): string | null {
  const e = err as { code?: unknown } | null
  return e && typeof e.code === 'string' ? e.code : null
}

// ── Converters ─────────────────────────────────────────────────────────────────
function dbToHabit(h: DbHabit): Habit {
  return {
    id: h.app_id,
    label: h.label,
    short: h.short,
    type: h.type as Habit['type'],
    color: h.color,
    ...(h.goal != null            ? { goal: h.goal }                     : {}),
    ...(h.target_per_week != null ? { targetPerWeek: h.target_per_week } : {}),
    ...(h.unit != null            ? { unit: h.unit }                     : {}),
  }
}

function dbToDay(d: DbDay): Day {
  return {
    day: d.day,
    weekday: d.weekday,
    status: d.status as Day['status'],
    highlight: d.highlight,
    milestone: d.milestone,
    habits: d.habit_values ?? {},
  }
}

function dbToGoal(g: DbGoal): Goal {
  return { id: g.app_id, text: g.text, done: g.done }
}

export function habitToRow(h: Habit, i: number) {
  return {
    app_id: h.id,
    label: h.label,
    short: h.short,
    type: h.type,
    color: h.color,
    goal: h.goal ?? null,
    target_per_week: h.targetPerWeek ?? null,
    unit: h.unit ?? null,
    position: i,
  }
}

export function goalToRow(g: Goal, i: number) {
  return { app_id: g.id, text: g.text, done: g.done, position: i }
}

// ── Fetch all data for a user ─────────────────────────────────────────────────
export interface FetchResult {
  months: Month[]
  tweaks: Tweaks | null
  uiState: { year: number; month: number; layout: LayoutType } | null
}

/**
 * Carga todo-o-nada.
 *
 * Antes solo se comprobaba el error de `months`; `habits`, `days` y `goals`
 * usaban `?? []`, de modo que un 401 o un timeout en cualquiera de ellas cargaba
 * los meses SIN días ni hábitos y el guardado los persistía vacíos — así se
 * perdieron los hábitos de junio. Ahora cualquier error aborta la carga entera:
 * es preferible una pantalla de error a un estado a medias que pueda escribirse.
 *
 * Las tres tablas hijas se consultan por `user_id` en vez de por
 * `.in('month_id', […])`: además de ser más simple, la URL deja de crecer con el
 * número de meses del usuario.
 */
export async function fetchAllData(supabase: SupabaseClient, userId: string): Promise<FetchResult> {
  const [monthsRes, habitsRes, daysRes, goalsRes, tweaksRes, uiRes] = await Promise.all([
    supabase.from('months').select('id, year, month, revision').eq('user_id', userId).order('year').order('month'),
    supabase.from('habits').select('*').eq('user_id', userId).order('position'),
    supabase.from('days').select('*').eq('user_id', userId).order('day'),
    supabase.from('goals').select('*').eq('user_id', userId).order('position'),
    supabase.from('tweaks').select('theme, density, accent').eq('user_id', userId).maybeSingle(),
    supabase.from('ui_state').select('active_year, active_month, layout').eq('user_id', userId).maybeSingle(),
  ])

  const failures = ([
    ['months', monthsRes.error], ['habits', habitsRes.error], ['days', daysRes.error],
    ['goals', goalsRes.error], ['tweaks', tweaksRes.error], ['ui_state', uiRes.error],
  ] as [string, PostgresError | null][]).filter(([, err]) => err)

  if (failures.length > 0) {
    throw new Error(
      'No se pudieron cargar los datos: ' +
      failures.map(([table, err]) => `${table} (${err!.message}${err!.code ? `, code ${err!.code}` : ''})`).join('; ')
    )
  }

  const monthRows = (monthsRes.data ?? []) as DbMonth[]
  const habitsByMonth = groupBy<DbHabit>((habitsRes.data ?? []) as DbHabit[], 'month_id')
  const daysByMonth   = groupBy<DbDay>((daysRes.data ?? []) as DbDay[], 'month_id')
  const goalsByMonth  = groupBy<DbGoal>((goalsRes.data ?? []) as DbGoal[], 'month_id')

  const months: Month[] = monthRows.map(row => ({
    year: row.year,
    month: row.month,
    revision: row.revision,
    habits: (habitsByMonth[row.id] ?? []).map(dbToHabit),
    days:   (daysByMonth[row.id]   ?? []).map(dbToDay),
    goals:  (goalsByMonth[row.id]  ?? []).map(dbToGoal),
  }))

  const dbTweaks = tweaksRes.data as DbTweaks | null
  const tweaks: Tweaks | null = dbTweaks
    ? { theme: dbTweaks.theme as Tweaks['theme'], density: dbTweaks.density as Tweaks['density'], accent: dbTweaks.accent }
    : null

  const dbUi = uiRes.data as DbUiState | null
  const uiState = dbUi && dbUi.active_year != null && dbUi.active_month != null
    ? { year: dbUi.active_year, month: dbUi.active_month, layout: dbUi.layout as LayoutType }
    : null

  return { months, tweaks, uiState }
}

/** Carga con reintentos: los 401 y los cortes de red son transitorios. */
export async function fetchAllDataWithRetry(
  supabase: SupabaseClient,
  userId: string,
  attempts = 3,
): Promise<FetchResult> {
  const delays = [500, 1500, 4000]
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fetchAllData(supabase, userId)
    } catch (err) {
      lastErr = err
      if (i < attempts - 1) await new Promise(r => setTimeout(r, delays[Math.min(i, delays.length - 1)]))
    }
  }
  throw lastErr
}

// ── Escrituras por intención ──────────────────────────────────────────────────
// Una operación = una intención. No existe ya un "reemplaza el mes entero":
// esa primitiva era la que convertía cualquier estado corrupto en memoria en la
// destrucción total del mes (julio y agosto de 2026).

/**
 * Crea un mes. SOLO inserta: si el mes ya existe el servidor responde OSM01.
 * Es el único camino por el que se escribe un mes completo, y está desacoplado
 * por completo de la edición de días.
 */
export async function createMonthInDB(supabase: SupabaseClient, month: Month): Promise<void> {
  const { error } = await supabase.rpc('create_month', {
    p_year: month.year,
    p_month: month.month,
    p_habits: month.habits.map(habitToRow),
    p_goals: month.goals.map(goalToRow),
  })
  if (error) throw Object.assign(new Error(`create_month: ${error.message}`), { code: error.code })
}

/** Escribe UN día. No puede afectar a ningún otro día, ni a hábitos ni a hitos. */
export async function saveDayToDB(
  supabase: SupabaseClient,
  year: number,
  month: number,
  day: Day,
): Promise<void> {
  const { error } = await supabase.rpc('save_day', {
    p_year: year,
    p_month: month,
    p_day: day.day,
    p_weekday: day.weekday,
    p_status: day.status,
    p_highlight: day.highlight,
    p_milestone: day.milestone,
    p_habit_values: day.habits,
  })
  if (error) throw Object.assign(new Error(`save_day: ${error.message}`), { code: error.code })
}

/** Reemplaza el conjunto de hábitos del mes. Devuelve la nueva revisión. */
export async function saveHabitsToDB(
  supabase: SupabaseClient,
  year: number,
  month: number,
  habits: Habit[],
  baseRevision?: number,
): Promise<number> {
  const { data, error } = await supabase.rpc('save_habits', {
    p_year: year,
    p_month: month,
    p_habits: habits.map(habitToRow),
    p_base_revision: baseRevision ?? null,
  })
  if (error) throw Object.assign(new Error(`save_habits: ${error.message}`), { code: error.code })
  return data as number
}

/** Reemplaza el conjunto de hitos del mes. Devuelve la nueva revisión. */
export async function saveGoalsToDB(
  supabase: SupabaseClient,
  year: number,
  month: number,
  goals: Goal[],
  baseRevision?: number,
): Promise<number> {
  const { data, error } = await supabase.rpc('save_goals', {
    p_year: year,
    p_month: month,
    p_goals: goals.map(goalToRow),
    p_base_revision: baseRevision ?? null,
  })
  if (error) throw Object.assign(new Error(`save_goals: ${error.message}`), { code: error.code })
  return data as number
}

/** Borra un mes. El servidor guarda copia (`source='pre-delete'`) antes de borrar. */
export async function deleteMonthFromDB(supabase: SupabaseClient, year: number, month: number): Promise<void> {
  const { error } = await supabase.rpc('delete_month', { p_year: year, p_month: month })
  if (error) throw Object.assign(new Error(`delete_month: ${error.message}`), { code: error.code })
}

/**
 * Revisión actual de un mes en el servidor. Se usa al recibir OSM03 para
 * recargarla y reintentar la escritura una sola vez.
 */
export async function fetchMonthRevision(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('months').select('revision')
    .eq('user_id', userId).eq('year', year).eq('month', month)
    .maybeSingle()
  if (error) throw new Error(`fetchMonthRevision: ${error.message}`)
  return (data as { revision: number } | null)?.revision ?? null
}

// ── Histórico de copias ───────────────────────────────────────────────────────
export interface SnapshotSummary {
  id: string
  year: number
  month: number
  source: string
  createdAt: string
  days: number
  habits: number
  goals: number
  highlights: number
}

export async function fetchMonthSnapshots(
  supabase: SupabaseClient,
  userId: string,
  year: number,
  month: number,
  limit = 40,
): Promise<SnapshotSummary[]> {
  const { data, error } = await supabase
    .from('month_snapshots')
    .select('id, year, month, source, created_at, snapshot')
    .eq('user_id', userId).eq('year', year).eq('month', month)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(`month_snapshots: ${error.message}`)

  interface SnapRow { id: string; year: number; month: number; source: string; created_at: string; snapshot: { habits?: unknown[]; days?: { highlight?: string }[]; goals?: unknown[] } }
  return ((data ?? []) as SnapRow[]).map(row => ({
    id: row.id,
    year: row.year,
    month: row.month,
    source: row.source,
    createdAt: row.created_at,
    days: row.snapshot?.days?.length ?? 0,
    habits: row.snapshot?.habits?.length ?? 0,
    goals: row.snapshot?.goals?.length ?? 0,
    highlights: (row.snapshot?.days ?? []).filter(d => (d?.highlight ?? '') !== '').length,
  }))
}

export async function restoreMonthSnapshot(supabase: SupabaseClient, snapshotId: string): Promise<void> {
  const { error } = await supabase.rpc('restore_month_snapshot', { p_snapshot_id: snapshotId })
  if (error) throw Object.assign(new Error(`restore_month_snapshot: ${error.message}`), { code: error.code })
}

// ── Save tweaks ───────────────────────────────────────────────────────────────
export async function saveTweaksToDB(supabase: SupabaseClient, userId: string, tweaks: Tweaks): Promise<void> {
  await supabase.from('tweaks').upsert({
    user_id: userId,
    theme: tweaks.theme,
    density: tweaks.density,
    accent: tweaks.accent,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

// ── Save UI state ─────────────────────────────────────────────────────────────
export async function saveUiStateToDB(supabase: SupabaseClient, userId: string, year: number, month: number, layout: LayoutType): Promise<void> {
  await supabase.from('ui_state').upsert({
    user_id: userId,
    active_year: year,
    active_month: month,
    layout,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

// ── Delete all user data ──────────────────────────────────────────────────────
export async function deleteAllUserData(supabase: SupabaseClient, userId: string): Promise<void> {
  await Promise.all([
    supabase.from('months').delete().eq('user_id', userId),
    supabase.from('tweaks').delete().eq('user_id', userId),
    supabase.from('ui_state').delete().eq('user_id', userId),
    supabase.from('login_events').delete().eq('user_id', userId),
    supabase.from('users').delete().eq('id', userId),
  ])
}

// ── Sync user profile from Clerk ──────────────────────────────────────────────
export interface UserProfile {
  email: string
  firstName: string | null
  lastName: string | null
  imageUrl: string
  clerkCreatedAt: Date | null
}

export async function upsertUserProfile(
  supabase: SupabaseClient,
  userId: string,
  profile: UserProfile
): Promise<void> {
  const { error } = await supabase.from('users').upsert({
    id: userId,
    email: profile.email,
    first_name: profile.firstName,
    last_name: profile.lastName,
    image_url: profile.imageUrl,
    clerk_created_at: profile.clerkCreatedAt?.toISOString() ?? null,
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'id' })
  if (error) console.error('[Osmin] upsertUserProfile failed:', error.message)
}

// ── Record login event ────────────────────────────────────────────────────────
export async function recordLoginEvent(
  supabase: SupabaseClient,
  userId: string
): Promise<void> {
  const { error } = await supabase.from('login_events').insert({
    user_id: userId,
    logged_at: new Date().toISOString(),
    user_agent: navigator.userAgent,
  })
  if (error) console.error('[Osmin] recordLoginEvent failed:', error.message)
}

// ── Utils ─────────────────────────────────────────────────────────────────────
function groupBy<T extends Record<string, unknown>>(arr: T[], key: string): Record<string, T[]> {
  const result: Record<string, T[]> = {}
  for (const item of arr) {
    const k = String(item[key])
    ;(result[k] ??= []).push(item)
  }
  return result
}
