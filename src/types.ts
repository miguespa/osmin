export type HabitType = 'check' | 'numeric' | 'text-check'
export type DayStatus = 'work' | 'holiday' | 'vacation'
export type LayoutType = 'table' | 'journal'
export type ViewMode = 'month' | 'stats' | 'edit'
export type Theme = 'light' | 'dark'
export type Density = 'comfy' | 'compact'

export interface Habit {
  id: string
  label: string
  short: string
  type: HabitType
  color: string
  targetPerWeek?: number
  goal?: number
  unit?: string
}

export interface Day {
  day: number
  weekday: number
  status: DayStatus
  highlight: string
  milestone: boolean
  habits: Record<string, number | string>
}

export interface Goal {
  id: string
  text: string
  done: boolean
}

export interface Month {
  year: number
  month: number
  habits: Habit[]
  days: Day[]
  goals: Goal[]
}

export interface Tweaks {
  theme: Theme
  density: Density
  accent: string
}

export interface HabitStats {
  done: number
  total: number
  pct: number
  expected?: number
  avg?: number
  sum?: number
}
