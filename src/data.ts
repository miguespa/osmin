import type { Habit, Day, Month, DayStatus, HabitStats } from './types'

export const WEEKDAYS_ES = ['D', 'L', 'M', 'X', 'J', 'V', 'S']
export const WEEKDAYS_LONG = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const DEFAULT_HABITS: Habit[] = [
  { id: 'gym',   label: 'GYM',        short: 'GYM',   type: 'check',   targetPerWeek: 3, color: '#1F8A5B' },
  { id: 'read',  label: 'Lectura',    short: 'Read',  type: 'check',   targetPerWeek: 7, color: '#7C5CD0' },
  { id: 'steps', label: 'Pasos',      short: 'Steps', type: 'numeric', goal: 7000, unit: '', color: '#2A6FDB' },
  { id: 'leave', label: 'Salir <19h', short: 'Out',   type: 'check',   targetPerWeek: 5, color: '#C97A2A' },
]

export const DAY_STATUS: Record<string, DayStatus> = {
  WORK: 'work',
  HOLIDAY: 'holiday',
  VACATION: 'vacation',
}

export function buildSampleMonth(): Month {
  const days: Day[] = []
  const total = 31
  const firstWeekday = 0
  for (let i = 1; i <= total; i++) {
    const wd = (firstWeekday + i - 1) % 7
    const isWeekend = wd === 0 || wd === 6
    days.push({
      day: i, weekday: wd,
      status: isWeekend ? 'holiday' : 'work',
      highlight: '', milestone: false,
      habits: { gym: 0, read: 0, steps: 0, leave: 0 },
    })
  }
  const set = (d: number, props: Partial<Day>) => Object.assign(days[d - 1], props)
  set(1,  { highlight: 'Sushito con Eve' })
  set(6,  { highlight: 'Finde pueblito — llegada' })
  set(7,  { highlight: 'Finde pueblito — Infantes + cena Coto', milestone: true })
  set(8,  { highlight: 'Finde pueblito — vuelta + Sushito' })
  set(9,  { highlight: 'Médico familia' })
  set(10, { highlight: 'Análisis sangre — LSH > 8 (de > 16)' })
  set(11, { highlight: 'Cena Max hacia Villran + consenso MC ingesta' })
  set(13, { highlight: 'Leadership + Black Star', milestone: true })
  set(14, { highlight: 'Serie "100 años de soledad" en Netflix' })
  set(15, { highlight: 'Cuidando a Eve con 40°' })
  set(16, { status: 'vacation', highlight: 'Endocrino — aumento a 100mg' })
  set(17, { status: 'vacation', highlight: 'Gripe — en moral' })
  set(18, { status: 'vacation', highlight: 'Gripe' })
  set(19, { status: 'vacation', highlight: 'Cenita navidad DATA + CRM', milestone: true })
  set(20, { status: 'vacation', highlight: 'Gripe — curso Google' })
  set(23, { status: 'vacation' })
  set(26, { status: 'vacation', highlight: 'Río' })
  set(27, { status: 'vacation', highlight: 'Río' })
  set(30, { status: 'vacation', highlight: 'Río — Tamara loca con souvenir + IPA' })
  set(31, { status: 'vacation', highlight: 'Aperitivo + cenita nochevieja en moral', milestone: true })

  const gymDays   = [2, 3, 4, 5, 9, 10, 11, 12, 13, 16]
  const readDays  = [1, 2, 4, 5, 6, 9, 11, 13, 14, 15, 22, 24, 27, 29]
  const leaveDays = [2, 3, 4, 5, 9, 10, 11, 12, 13, 16, 19]
  const steps: Record<number, number> = {
    1: 6800, 2: 8400, 3: 9200, 4: 7900, 5: 8800, 6: 11200, 7: 14600, 8: 9100,
    9: 8200, 10: 7600, 11: 9400, 12: 8900, 13: 10200, 14: 6300, 15: 5400,
    16: 7100, 17: 1800, 18: 1200, 19: 4400, 20: 2900, 21: 5600, 22: 7200,
    23: 6100, 24: 8400, 25: 9300, 26: 10800, 27: 11200, 28: 9600, 29: 8400,
    30: 12400, 31: 8900,
  }
  for (const d of gymDays)   days[d - 1].habits.gym = 1
  for (const d of readDays)  days[d - 1].habits.read = 1
  for (const d of leaveDays) days[d - 1].habits.leave = 1
  for (const [d, v] of Object.entries(steps)) days[+d - 1].habits.steps = v
  set(24, { status: 'holiday' })
  set(25, { status: 'holiday' })

  return {
    year: 2024, month: 11,
    habits: DEFAULT_HABITS,
    days,
    goals: [
      { id: 'g1', text: 'Cerrar Q4 con cena de equipo', done: true },
      { id: 'g2', text: 'Recuperar de la gripe antes de Navidad', done: true },
      { id: 'g3', text: 'Terminar curso Google PMP', done: false },
      { id: 'g4', text: 'Año Nuevo en el río con la familia', done: true },
      { id: 'g5', text: 'Leer 2 libros antes de fin de año', done: false },
    ],
  }
}

export function buildBlankMonth(year: number, monthIdx: number, prevHabits?: Habit[]): Month {
  const habits = (prevHabits || DEFAULT_HABITS).map(h => ({ ...h }))
  const firstWeekday = new Date(year, monthIdx, 1).getDay()
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
  const days: Day[] = []
  for (let i = 1; i <= daysInMonth; i++) {
    const wd = (firstWeekday + i - 1) % 7
    const isWeekend = wd === 0 || wd === 6
    const habitValues: Record<string, number> = {}
    for (const h of habits) habitValues[h.id] = 0
    days.push({
      day: i, weekday: wd,
      status: isWeekend ? 'holiday' : 'work',
      highlight: '', milestone: false,
      habits: habitValues,
    })
  }
  return { year, month: monthIdx, habits, days, goals: [] }
}

export function habitStats(month: Month, habit: Habit): HabitStats {
  const days = month.days
  if (habit.type === 'check') {
    const done = days.filter(d => d.habits[habit.id] === 1).length
    const tpw = habit.targetPerWeek || 7
    const expected = Math.max(1, Math.round((days.length / 7) * tpw))
    const pct = Math.min(100, Math.round((done / expected) * 100))
    return { done, total: days.length, expected, pct }
  }
  if (habit.type === 'numeric') {
    const goal = habit.goal!
    const hit = days.filter(d => (d.habits[habit.id] || 0) >= goal).length
    const sum = days.reduce((a, d) => a + (d.habits[habit.id] || 0), 0)
    return {
      done: hit, total: days.length,
      pct: Math.round((hit / days.length) * 100),
      avg: Math.round(sum / days.length),
      sum,
    }
  }
  return { done: 0, total: 0, pct: 0 }
}

export function habitStreak(month: Month, habit: Habit): number {
  const days = month.days
  let best = 0, cur = 0
  for (const d of days) {
    const v = d.habits[habit.id]
    const ok = habit.type === 'check' ? v === 1 : (v || 0) >= habit.goal!
    if (ok) { cur++; best = Math.max(best, cur) } else { cur = 0 }
  }
  return best
}

export function cycleCheck(v: number | undefined): number {
  if (v === 0 || v === undefined) return 1
  if (v === 1) return -1
  return 0
}

export function cycleStatus(s: string): DayStatus {
  if (s === 'work') return 'holiday'
  if (s === 'holiday') return 'vacation'
  return 'work'
}
