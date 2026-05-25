import { useState, ReactNode } from 'react'
import { habitStats, habitStreak, MONTHS_ES } from '../data'
import type { Month, Habit, Goal } from '../types'

function StarIcon({ filled = true, size = 14 }: { filled?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14"
      fill={filled ? 'var(--accent)' : 'none'}
      stroke={filled ? 'var(--accent)' : 'var(--text-muted)'}
      strokeWidth="1.5" strokeLinejoin="round">
      <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z" />
    </svg>
  )
}

function OverviewStatTile({ habit, month }: { habit: Habit; month: Month }) {
  const stats = habitStats(month, habit)
  const streak = habitStreak(month, habit)
  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color }} />
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{habit.label}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {habit.type === 'numeric'
            ? `${(habit.goal ?? 0).toLocaleString('es')}/día`
            : (habit.targetPerWeek === 7 ? 'todos los días' : `${habit.targetPerWeek}/sem`)}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 38, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {habit.type === 'numeric' ? (stats.avg ?? 0).toLocaleString('es') : stats.done}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
          {habit.type === 'numeric' ? 'media/día' : `de ${stats.total}`}
        </div>
      </div>
      <div style={{ height: 4, borderRadius: 2, background: 'var(--line)', overflow: 'hidden' }}>
        <div style={{ width: `${stats.pct}%`, height: '100%', background: habit.color }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
        <span>{stats.pct}% cumplido</span>
        <span>racha {streak}d</span>
      </div>
    </div>
  )
}

function GoalRow({ goal, onChange, onDelete }: { goal: Goal; onChange: (mut: Partial<Goal>) => void; onDelete: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
      <button
        onClick={() => onChange({ done: !goal.done })}
        style={{
          width: 22, height: 22, borderRadius: 6,
          border: `1.5px solid ${goal.done ? 'var(--accent)' : 'var(--line-strong)'}`,
          background: goal.done ? 'var(--accent)' : 'transparent',
          cursor: 'pointer', padding: 0, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 120ms',
        }}
      >
        {goal.done && (
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
            <path d="M3 7.5L5.8 10L11 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>
      <input
        value={goal.text}
        onChange={e => onChange({ text: e.target.value })}
        placeholder="Escribe un objetivo del mes…"
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'Inter, sans-serif', fontSize: 14.5,
          color: goal.done ? 'var(--text-muted)' : 'var(--text)',
          textDecoration: goal.done ? 'line-through' : 'none',
          padding: 0,
        }}
      />
      <button onClick={onDelete} title="Eliminar" style={{
        width: 22, height: 22, borderRadius: 6, border: 'none',
        background: 'transparent', cursor: 'pointer',
        color: 'var(--text-muted)', opacity: 0.5,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function GoalsChecklist({ month, setMonth }: { month: Month; setMonth: (updater: Month | ((prev: Month) => Month)) => void }) {
  const goals = month.goals || []
  const updateGoal = (id: string, mut: Partial<Goal>) => setMonth(m => ({
    ...m, goals: m.goals.map(g => g.id === id ? { ...g, ...mut } : g),
  }))
  const deleteGoal = (id: string) => setMonth(m => ({ ...m, goals: m.goals.filter(g => g.id !== id) }))
  const addGoal = () => setMonth(m => ({
    ...m, goals: [...m.goals, { id: 'g' + Date.now(), text: '', done: false }],
  }))
  const done = goals.filter(g => g.done).length
  const atLimit = goals.length >= 5

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '16px 18px 12px', borderBottom: '1px solid var(--line)' }}>
        <div>
          <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 22, color: 'var(--text)' }}>Hitos que me marco este mes</h3>
          <div style={{ marginTop: 2, fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
            Define 4-5 objetivos principales y márcalos a lo largo del mes
          </div>
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{done}/{goals.length}</div>
      </div>
      <div>
        {goals.map(g => (
          <GoalRow key={g.id} goal={g} onChange={mut => updateGoal(g.id, mut)} onDelete={() => deleteGoal(g.id)} />
        ))}
      </div>
      <div style={{ padding: '10px 14px' }}>
        <button onClick={addGoal} disabled={atLimit} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
          border: '1px dashed var(--line-strong)', background: 'transparent',
          cursor: atLimit ? 'not-allowed' : 'pointer',
          color: atLimit ? 'var(--text-muted)' : 'var(--text-soft)',
          fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 500,
          opacity: atLimit ? 0.5 : 1, width: '100%', justifyContent: 'center',
        }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {atLimit ? 'Máximo 5 hitos' : 'Añadir hito'}
        </button>
      </div>
    </div>
  )
}

function MonthMilestones({ month }: { month: Month }) {
  const ms = month.days.filter(d => d.milestone)
  const WEEKDAYS_LONG_LOCAL = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 22, color: 'var(--text)' }}>Días destacados</h3>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>marcados con ★ desde la vista mensual</div>
      </div>
      {ms.length === 0 ? (
        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Aún no has marcado ningún día como destacado este mes.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {ms.map(d => {
            const wd = WEEKDAYS_LONG_LOCAL[d.weekday]
            return (
              <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 4px', borderBottom: '1px solid var(--line-soft)' }}>
                <StarIcon size={13} />
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>{String(d.day).padStart(2, '0')}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)', textTransform: 'lowercase', minWidth: 70 }}>{wd}</div>
                <div style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>
                  {d.highlight || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(sin descripción)</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ColorDot({ color, options, onChange }: { color: string; options: string[]; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        width: 18, height: 18, borderRadius: '50%',
        background: color, border: '1.5px solid var(--surface)',
        boxShadow: '0 0 0 1px var(--line)', cursor: 'pointer', padding: 0,
      }} />
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 100 }} />
          <div style={{
            position: 'absolute', top: 24, left: 0, zIndex: 101,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 8, padding: 6, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            display: 'grid', gridTemplateColumns: 'repeat(3, 18px)', gap: 6,
          }}>
            {options.map(c => (
              <button key={c} onClick={() => { onChange(c); setOpen(false) }} style={{
                width: 18, height: 18, borderRadius: '50%',
                background: c, border: c === color ? '2px solid var(--text)' : '1px solid var(--line)',
                cursor: 'pointer', padding: 0,
              }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function TargetEditor({ habit, onChange }: { habit: Habit; onChange: (mut: Partial<Habit>) => void }) {
  if (habit.type === 'numeric') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" value={habit.goal || 0}
          onChange={e => onChange({ goal: Math.max(0, parseInt(e.target.value, 10) || 0) })}
          style={{
            width: 80, height: 26, border: '1px solid var(--line)', borderRadius: 6,
            background: 'var(--surface-alt)', color: 'var(--text)', padding: '0 8px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontVariantNumeric: 'tabular-nums',
            textAlign: 'right', outline: 'none',
          }}
        />
        <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>al día</span>
      </div>
    )
  }
  const tpw = habit.targetPerWeek || 7
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <select value={tpw} onChange={e => onChange({ targetPerWeek: parseInt(e.target.value, 10) })} style={{
        height: 26, padding: '0 22px 0 8px',
        border: '1px solid var(--line)', borderRadius: 6,
        background: 'var(--surface-alt)', color: 'var(--text)',
        fontFamily: 'Inter, sans-serif', fontSize: 12, outline: 'none', cursor: 'pointer',
        appearance: 'none', WebkitAppearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path fill='gray' d='M0 0h10L5 6z'/></svg>\")",
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center',
      }}>
        {[1, 2, 3, 4, 5, 6, 7].map(n => (
          <option key={n} value={n}>
            {n === 7 ? 'Todos los días' : `${n} ${n === 1 ? 'día' : 'días'}/semana`}
          </option>
        ))}
      </select>
    </div>
  )
}

function HabitRow({ habit, palette, onChange, onDelete, canDelete }: { habit: Habit; palette: string[]; onChange: (mut: Partial<Habit>) => void; onDelete: () => void; canDelete: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '24px 1.2fr 0.55fr 1fr 1.2fr 28px', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}>
      <ColorDot color={habit.color} options={palette} onChange={c => onChange({ color: c })} />
      <input value={habit.label} onChange={e => onChange({ label: e.target.value })} placeholder="Nombre del hábito" style={{ border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 6, padding: '3px 7px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0, width: '100%', display: 'block' }} />
      <input value={habit.short} onChange={e => onChange({ short: e.target.value.slice(0, 7) })} maxLength={7} placeholder="Abrev." title="Texto en cabecera de vista mensual" style={{ border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 6, padding: '3px 7px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text)', minWidth: 0, width: '100%' }} />
      <div style={{ display: 'inline-flex', padding: 2, background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: 7 }}>
        {[{ id: 'check', label: 'Check' }, { id: 'numeric', label: 'Número' }].map(o => (
          <button key={o.id} onClick={() => onChange(o.id === 'numeric' ? { type: 'numeric', goal: habit.goal || 7000 } : { type: 'check', targetPerWeek: habit.targetPerWeek || 7 })} style={{ padding: '4px 10px', flex: 1, background: habit.type === o.id ? 'var(--surface)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 5, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: habit.type === o.id ? 600 : 500, color: habit.type === o.id ? 'var(--text)' : 'var(--text-muted)' }}>{o.label}</button>
        ))}
      </div>
      <TargetEditor habit={habit} onChange={onChange} />
      <button onClick={onDelete} disabled={!canDelete} title="Eliminar hábito" style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: canDelete ? 'pointer' : 'not-allowed', color: 'var(--text-muted)', opacity: canDelete ? 0.5 : 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  )
}

function HabitEditor({ month, setMonth }: { month: Month; setMonth: (updater: Month | ((prev: Month) => Month)) => void }) {
  const [collapsed, setCollapsed] = useState(false)
  const habits = month.habits
  const palette = ['#1F8A5B', '#7C5CD0', '#2A6FDB', '#C97A2A', '#D9445C', '#0E8E8E']
  const update = (id: string, mut: Partial<Habit>) => setMonth(m => ({ ...m, habits: m.habits.map(h => h.id === id ? { ...h, ...mut } : h) }))
  const remove = (id: string) => setMonth(m => {
    const next = { ...m, habits: m.habits.filter(h => h.id !== id) }
    next.days = next.days.map(d => { const habits = { ...d.habits }; delete habits[id]; return { ...d, habits } })
    return next
  })
  const add = () => setMonth(m => {
    const id = 'h' + Date.now()
    const used = m.habits.map(h => h.color)
    const color = palette.find(c => !used.includes(c)) || palette[m.habits.length % palette.length]
    return {
      ...m,
      habits: [...m.habits, { id, label: 'Nuevo hábito', short: 'New', type: 'check', targetPerWeek: 7, color }],
      days: m.days.map(d => ({ ...d, habits: { ...d.habits, [id]: 0 } })),
    }
  })

  return (
    <div id="habits-section" style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px 12px', borderBottom: collapsed ? 'none' : '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 22, color: 'var(--text)' }}>Configuración de hábitos</h3>
          <div style={{ marginTop: 2, fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>
            {collapsed ? `${habits.length} hábitos configurados` : 'Personaliza qué tracker y target quieres para este mes'}
          </div>
        </div>
        <button onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expandir' : 'Minimizar'} style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid var(--line)', background: 'var(--surface-alt)', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-soft)', padding: 0 }}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)', transition: 'transform 160ms' }}>
            <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
      {!collapsed && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '24px 1.2fr 0.55fr 1fr 1.2fr 28px', gap: 12, padding: '5px 14px 4px', borderBottom: '1px solid var(--line-soft)', fontFamily: 'Inter, sans-serif', fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <div /><div>Nombre</div><div>Vista</div><div>Tipo</div><div>Target</div><div />
          </div>
          {habits.map(h => (
            <HabitRow key={h.id} habit={h} palette={palette} onChange={mut => update(h.id, mut)} onDelete={() => remove(h.id)} canDelete={habits.length > 1} />
          ))}
          <div style={{ padding: '10px 14px' }}>
            <button onClick={add} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, border: '1px dashed var(--line-strong)', background: 'transparent', cursor: 'pointer', color: 'var(--text-soft)', fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 500, width: '100%', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
              Añadir hábito
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, paddingLeft: 2 }}>{children}</div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 36, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ marginTop: 4, fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>
    </div>
  )
}

interface OverviewViewProps {
  month: Month
  setMonth: (updater: Month | ((prev: Month) => Month)) => void
}

export function OverviewView({ month, setMonth }: OverviewViewProps) {
  const totalDone = month.habits.reduce((sum, h) => sum + habitStats(month, h).done, 0)
  const totalPossible = month.habits.length * month.days.length
  const avgPct = Math.round((totalDone / totalPossible) * 100)
  const goals = month.goals || []
  const goalsDone = goals.filter(g => g.done).length
  const goalsPct = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <SummaryCard label="Cumplimiento general" value={`${avgPct}%`} sub={`media de ${month.habits.length} hábitos`} />
        <SummaryCard label="Hitos del mes" value={`${goalsDone}/${goals.length || 0}`} sub={`${goalsPct}% completado`} />
        <SummaryCard label="Días destacados" value={month.days.filter(d => d.milestone).length} sub="marcados con ★" />
      </div>
      <GoalsChecklist month={month} setMonth={setMonth} />
      <div>
        <SectionLabel>Estadísticas por hábito</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {month.habits.map(h => <OverviewStatTile key={h.id} habit={h} month={month} />)}
        </div>
      </div>
      <HabitEditor month={month} setMonth={setMonth} />
      <MonthMilestones month={month} />
    </div>
  )
}

// Re-export MONTHS_ES for use in App
export { MONTHS_ES }
