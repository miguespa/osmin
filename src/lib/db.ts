import type { SupabaseClient } from './supabase'
import type { Month, Habit, Day, Goal, Tweaks, LayoutType } from '../types'

// ── Types for DB rows ─────────────────────────────────────────────────────────
interface DbMonth   extends Record<string, unknown> { id: string; year: number; month: number }
interface DbHabit   extends Record<string, unknown> { month_id: string; app_id: string; label: string; short: string; type: string; color: string; goal: number | null; target_per_week: number | null; unit: string | null; position: number }
interface DbDay     extends Record<string, unknown> { month_id: string; day: number; weekday: number; status: string; highlight: string; milestone: boolean; habit_values: Record<string, number> }
interface DbGoal    extends Record<string, unknown> { month_id: string; app_id: string; text: string; done: boolean; position: number }
interface DbTweaks  { theme: string; density: string; accent: string }
interface DbUiState { active_year: number | null; active_month: number | null; layout: string }

// ── Converters ─────────────────────────────────────────────────────────────────
function dbToHabit(h: DbHabit): Habit {
  return {
    id: h.app_id,
    label: h.label,
    short: h.short,
    type: h.type as Habit['type'],
    color: h.color,
    ...(h.goal != null          ? { goal: h.goal }                   : {}),
    ...(h.target_per_week != null ? { targetPerWeek: h.target_per_week } : {}),
    ...(h.unit != null          ? { unit: h.unit }                   : {}),
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

// ── Fetch all data for a user ─────────────────────────────────────────────────
export interface FetchResult {
  months: Month[]
  tweaks: Tweaks | null
  uiState: { year: number; month: number; layout: LayoutType } | null
}

export async function fetchAllData(supabase: SupabaseClient, userId: string): Promise<FetchResult> {
  const [monthsRes, tweaksRes, uiRes] = await Promise.all([
    supabase.from('months').select('id, year, month').eq('user_id', userId).order('year').order('month'),
    supabase.from('tweaks').select('theme, density, accent').eq('user_id', userId).maybeSingle(),
    supabase.from('ui_state').select('active_year, active_month, layout').eq('user_id', userId).maybeSingle(),
  ])

  // A Supabase error here (e.g. 401) means JWT invalid or misconfigured auth.
  // Without this check the app silently treats auth failures as "no data".
  if (monthsRes.error) {
    throw new Error(`fetch months: ${monthsRes.error.message} (code: ${monthsRes.error.code})`)
  }

  const monthRows: DbMonth[] = monthsRes.data ?? []

  let months: Month[] = []

  if (monthRows.length > 0) {
    const monthIds = monthRows.map(m => m.id)
    const [habitsRes, daysRes, goalsRes] = await Promise.all([
      supabase.from('habits').select('*').in('month_id', monthIds).order('position'),
      supabase.from('days').select('*').in('month_id', monthIds).order('day'),
      supabase.from('goals').select('*').in('month_id', monthIds).order('position'),
    ])

    const habitsByMonth = groupBy<DbHabit>(habitsRes.data ?? [], 'month_id')
    const daysByMonth   = groupBy<DbDay>(daysRes.data ?? [],   'month_id')
    const goalsByMonth  = groupBy<DbGoal>(goalsRes.data ?? [], 'month_id')

    months = monthRows.map(row => ({
      year: row.year,
      month: row.month,
      habits: (habitsByMonth[row.id] ?? []).map(dbToHabit),
      days:   (daysByMonth[row.id]   ?? []).map(dbToDay),
      goals:  (goalsByMonth[row.id]  ?? []).map(dbToGoal),
    }))
  }

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

// ── Save a single month (full upsert) ─────────────────────────────────────────
export async function saveMonthToDB(supabase: SupabaseClient, userId: string, month: Month): Promise<void> {
  const { data: existingMonth } = await supabase
    .from('months')
    .select('id')
    .eq('user_id', userId)
    .eq('year', month.year)
    .eq('month', month.month)
    .maybeSingle()

  let monthId: string

  if (existingMonth) {
    monthId = (existingMonth as { id: string }).id
  } else {
    // INSERT without .select() to avoid PostgREST "Prefer: return=representation"
    // which requires a proper PK — the DB may be missing it if created with an old schema.
    const { error: insertErr } = await supabase
      .from('months')
      .insert({ user_id: userId, year: month.year, month: month.month })
    if (insertErr) {
      console.error('[Osmin] saveMonth — months insert failed:', insertErr.message, insertErr)
      throw new Error(`months insert: ${insertErr.message}`)
    }
    // Fetch the id in a separate call
    const { data: fetched, error: fetchErr } = await supabase
      .from('months')
      .select('id')
      .eq('user_id', userId)
      .eq('year', month.year)
      .eq('month', month.month)
      .maybeSingle()
    if (fetchErr || !fetched) {
      const msg = fetchErr?.message ?? 'row not found after insert'
      console.error('[Osmin] saveMonth — months fetch failed:', msg)
      throw new Error(`months insert: ${msg}`)
    }
    monthId = (fetched as { id: string }).id
  }

  const habitRows = month.habits.map((h, i) => ({
    month_id: monthId,
    user_id: userId,
    app_id: h.id,
    label: h.label,
    short: h.short,
    type: h.type,
    color: h.color,
    goal: h.goal ?? null,
    target_per_week: h.targetPerWeek ?? null,
    unit: h.unit ?? null,
    position: i,
  }))

  const dayRows = month.days.map(d => ({
    month_id: monthId,
    user_id: userId,
    day: d.day,
    weekday: d.weekday,
    status: d.status,
    highlight: d.highlight,
    milestone: d.milestone,
    habit_values: d.habits,
  }))

  const goalRows = month.goals.map((g, i) => ({
    month_id: monthId,
    user_id: userId,
    app_id: g.id,
    text: g.text,
    done: g.done,
    position: i,
  }))

  await supabase.from('days').delete().eq('month_id', monthId)
  if (dayRows.length > 0) {
    const { error: daysErr } = await supabase.from('days').insert(dayRows)
    if (daysErr) {
      console.error('[Osmin] saveMonth — days insert failed:', daysErr.message, daysErr)
      throw new Error(`days insert: ${daysErr.message}`)
    }
  }

  await supabase.from('habits').delete().eq('month_id', monthId)
  if (habitRows.length > 0) {
    const { error: habitsErr } = await supabase.from('habits').insert(habitRows)
    if (habitsErr) console.error('[Osmin] saveMonth — habits insert failed:', habitsErr.message, habitsErr)
  }

  await supabase.from('goals').delete().eq('month_id', monthId)
  if (goalRows.length > 0) {
    const { error: goalsErr } = await supabase.from('goals').insert(goalRows)
    if (goalsErr) console.error('[Osmin] saveMonth — goals insert failed:', goalsErr.message, goalsErr)
  }
}

// ── Delete a month ─────────────────────────────────────────────────────────────
export async function deleteMonthFromDB(supabase: SupabaseClient, userId: string, year: number, month: number): Promise<void> {
  await supabase.from('months').delete().eq('user_id', userId).eq('year', year).eq('month', month)
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
