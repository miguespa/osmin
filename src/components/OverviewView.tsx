import { useState, ReactNode } from 'react'
import { habitStats, habitStreak, MONTHS_ES } from '../data'
import type { Month, Habit, Goal, Day } from '../types'
import { TextCheckExplainer } from './TextCheckModal'

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
            : (habit.targetPerWeek === 7 ? 'todos los días' : `${habit.targetPerWeek}/sem`)
          }
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 38, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
          {habit.type === 'numeric' ? (stats.avg ?? 0).toLocaleString('es') : stats.done}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)' }}>
          {habit.type === 'numeric' ? 'media/día' : `de ${stats.expected ?? stats.total}`}
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

function GoalsChecklist({ month, onGoalsChange }: {
  month: Month
  /** Notifica el nuevo conjunto de hitos. No puede tocar días ni hábitos. */
  onGoalsChange: (goals: Goal[]) => void
}) {
  const goals = month.goals || []
  const updateGoal = (id: string, mut: Partial<Goal>) =>
    onGoalsChange(goals.map(g => g.id === id ? { ...g, ...mut } : g))
  const deleteGoal = (id: string) => onGoalsChange(goals.filter(g => g.id !== id))
  const addGoal = () => onGoalsChange([...goals, { id: 'g' + Date.now(), text: '', done: false }])
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
  if (habit.type === 'text-check') {
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
            <option key={n} value={n}>{n === 7 ? 'Todos los días' : `${n} ${n === 1 ? 'día' : 'días'}/semana`}</option>
          ))}
        </select>
      </div>
    )
  }
  if (habit.type === 'numeric') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input type="number" inputMode="numeric" value={habit.goal || 0}
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

const TYPE_OPTIONS = [
  { id: 'check', label: 'Check' },
  { id: 'text-check', label: 'Texto' },
  { id: 'numeric', label: 'Núm.' },
] as const

function HabitRow({ habit, palette, onChange, onDelete, canDelete, isMobile = false }: { habit: Habit; palette: string[]; onChange: (mut: Partial<Habit>) => void; onDelete: () => void; canDelete: boolean; isMobile?: boolean }) {
  const [explainerFor, setExplainerFor] = useState<string | null>(null)

  const handleTypeChange = (typeId: string) => {
    if (typeId === 'text-check' && habit.type !== 'text-check') {
      setExplainerFor(habit.label)
      return
    }
    applyTypeChange(typeId)
  }

  const applyTypeChange = (typeId: string) => {
    onChange(
      typeId === 'numeric' ? { type: 'numeric', goal: habit.goal || 7000 } :
      typeId === 'text-check' ? { type: 'text-check', targetPerWeek: habit.targetPerWeek || 7 } :
      { type: 'check', targetPerWeek: habit.targetPerWeek || 7 }
    )
  }

  const TypeSwitcher = ({ compact = false }: { compact?: boolean }) => (
    <div style={{ display: 'inline-flex', padding: 2, background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: compact ? 8 : 7 }}>
      {TYPE_OPTIONS.map(o => (
        <button key={o.id} onClick={() => handleTypeChange(o.id)} style={{
          padding: compact ? '7px 12px' : '4px 8px', flex: 1,
          background: habit.type === o.id ? 'var(--surface)' : 'transparent',
          border: 'none', cursor: 'pointer', borderRadius: compact ? 6 : 5,
          fontFamily: 'Inter, sans-serif', fontSize: compact ? 12 : 11,
          fontWeight: habit.type === o.id ? 600 : 500,
          color: habit.type === o.id ? 'var(--text)' : 'var(--text-muted)',
          whiteSpace: 'nowrap',
        }}>{o.label}</button>
      ))}
    </div>
  )

  return (
    <>
      {explainerFor && (
        <TextCheckExplainer
          habitLabel={explainerFor}
          onConfirm={() => { applyTypeChange('text-check'); setExplainerFor(null) }}
          onCancel={() => setExplainerFor(null)}
        />
      )}
      {isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '12px 14px', borderBottom: '1px solid var(--line-soft)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ColorDot color={habit.color} options={palette} onChange={c => onChange({ color: c })} />
            <input value={habit.label} onChange={e => onChange({ label: e.target.value })} placeholder="Nombre del hábito" style={{ flex: 1, minWidth: 0, border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 7, padding: '8px 10px', fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500, color: 'var(--text)' }} />
            <input value={habit.short} onChange={e => onChange({ short: e.target.value.slice(0, 7) })} maxLength={7} placeholder="Abrev." style={{ width: 64, border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 7, padding: '8px 8px', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600, color: 'var(--text)', textAlign: 'center' }} />
            <button onClick={onDelete} disabled={!canDelete} aria-label="Eliminar hábito" style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', cursor: canDelete ? 'pointer' : 'not-allowed', color: 'var(--text-muted)', opacity: canDelete ? 1 : 0.3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 12 12" fill="none"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <TypeSwitcher compact />
            <TargetEditor habit={habit} onChange={onChange} />
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '24px 1.2fr 0.55fr 1fr 1.2fr 28px', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid var(--line-soft)' }}>
          <ColorDot color={habit.color} options={palette} onChange={c => onChange({ color: c })} />
          <input value={habit.label} onChange={e => onChange({ label: e.target.value })} placeholder="Nombre del hábito" style={{ border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 6, padding: '3px 7px', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'var(--text)', minWidth: 0, width: '100%', display: 'block' }} />
          <input value={habit.short} onChange={e => onChange({ short: e.target.value.slice(0, 7) })} maxLength={7} placeholder="Abrev." title="Texto en cabecera de vista mensual" style={{ border: '1px solid var(--line)', outline: 'none', background: 'var(--surface-alt)', borderRadius: 6, padding: '3px 7px', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, color: 'var(--text)', minWidth: 0, width: '100%' }} />
          <TypeSwitcher />
          <TargetEditor habit={habit} onChange={onChange} />
          <button onClick={onDelete} disabled={!canDelete} title="Eliminar hábito" style={{ width: 24, height: 24, borderRadius: 6, border: 'none', background: 'transparent', cursor: canDelete ? 'pointer' : 'not-allowed', color: 'var(--text-muted)', opacity: canDelete ? 0.5 : 0.2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}
    </>
  )
}

function HabitEditor({ month, onHabitsChange, isMobile = false }: {
  month: Month
  /**
   * Notifica el nuevo conjunto de hábitos, y los días ya reajustados cuando la
   * edición cambia las claves de `habits` de cada día (añadir o quitar hábito).
   * El servidor rehace esas claves dentro de la misma transacción; `days` viaja
   * solo para que la vista no parpadee mientras responde.
   */
  onHabitsChange: (habits: Habit[], days?: Day[]) => void
  isMobile?: boolean
}) {
  const [collapsed, setCollapsed] = useState(false)
  const habits = month.habits
  const palette = ['#1F8A5B', '#7C5CD0', '#2A6FDB', '#C97A2A', '#D9445C', '#0E8E8E']

  const update = (id: string, mut: Partial<Habit>) =>
    onHabitsChange(month.habits.map(h => h.id === id ? { ...h, ...mut } : h))

  const remove = (id: string) => onHabitsChange(
    month.habits.filter(h => h.id !== id),
    month.days.map(d => { const habits = { ...d.habits }; delete habits[id]; return { ...d, habits } }),
  )

  const add = () => {
    const id = 'h' + Date.now()
    const used = month.habits.map(h => h.color)
    const color = palette.find(c => !used.includes(c)) || palette[month.habits.length % palette.length]
    onHabitsChange(
      [...month.habits, { id, label: 'Nuevo hábito', short: 'New', type: 'check', targetPerWeek: 7, color }],
      month.days.map(d => ({ ...d, habits: { ...d.habits, [id]: 0 } })),
    )
  }

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
          {!isMobile && (
            <div style={{ display: 'grid', gridTemplateColumns: '24px 1.2fr 0.55fr 1fr 1.2fr 28px', gap: 12, padding: '5px 14px 4px', borderBottom: '1px solid var(--line-soft)', fontFamily: 'Inter, sans-serif', fontSize: 9.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              <div /><div>Nombre</div><div>Vista</div><div>Tipo</div><div>Target</div><div />
            </div>
          )}
          {habits.map(h => (
            <HabitRow key={h.id} habit={h} palette={palette} onChange={mut => update(h.id, mut)} onDelete={() => remove(h.id)} canDelete={habits.length > 1} isMobile={isMobile} />
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

function EmptyHint({ text }: { text: string }) {
  return (
    <div style={{ gridColumn: '1 / -1', padding: '28px 8px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: 13, background: 'var(--surface)', border: '1px dashed var(--line-strong)', borderRadius: 12 }}>
      {text}
    </div>
  )
}

// Calendario del mes — solo lectura, refleja hábitos cumplidos y días destacados
function StatsCalendar({ month }: { month: Month }) {
  if (!month.days || month.days.length === 0) return null
  const _today = new Date()
  const todayDay = (month.year === _today.getFullYear() && month.month === _today.getMonth())
    ? _today.getDate() : null
  const firstDay = month.days[0].weekday
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (Day | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (const d of month.days) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const wdHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 20px 20px' }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 22, color: 'var(--text)' }}>Calendario del mes</h3>
      </div>
      <div style={{ maxWidth: 420 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
        {wdHeaders.map((w, i) => (
          <div key={i} style={{
            textAlign: 'center', fontFamily: 'JetBrains Mono, monospace', fontSize: 10,
            color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>{w}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const isToday = d.day === todayDay
          const bg = d.status === 'holiday' ? 'var(--c-festivo)' :
            d.status === 'vacation' ? 'var(--c-vacaciones)' : 'transparent'
          const habitDots = month.habits.map((h: Habit) => {
            const v = d.habits[h.id]
            const ok = h.type === 'check' ? v === 1
              : h.type === 'text-check' ? (typeof v === 'string' && v.length > 0)
              : (Number(v) || 0) >= (h.goal ?? 0)
            return ok ? h.color : null
          })
          const allDone = month.habits.length > 0 && habitDots.every(c => c !== null)
          return (
            <div key={i} style={{
              aspectRatio: '1', padding: 4,
              background: isToday && bg === 'transparent'
                ? `color-mix(in oklab, var(--accent) 10%, var(--surface))` : bg,
              border: isToday ? '1.5px solid var(--accent)' : '1px solid var(--line-soft)',
              borderRadius: 8,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
              position: 'relative',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
                color: bg !== 'transparent' ? '#1a1a1a' : isToday ? 'var(--accent)' : 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
              }}>{d.day}</div>
              {allDone
                ? <div style={{ position: 'absolute', top: 1, right: 2, fontSize: 8, lineHeight: 1 }}>🔥</div>
                : d.milestone && <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />
              }
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {habitDots.map((c, j) => (
                  <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: c || 'transparent', border: c ? 'none' : '1px solid var(--line)' }} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}

// Leyenda de colores — festivos, vacaciones y hábitos
function StatsLegend({ month, isMobile }: { month: Month; isMobile?: boolean }) {
  return (
    <div style={{
      padding: '10px 16px',
      background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
      fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)',
      display: 'flex', flexWrap: 'wrap', gap: isMobile ? '8px 16px' : '6px 24px',
      alignItems: 'center',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--text)', marginRight: 4 }}>Leyenda</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--c-festivo)', flexShrink: 0 }} />
        <span>Festivo / fin de semana</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--c-vacaciones)', flexShrink: 0 }} />
        <span>Vacaciones</span>
      </div>
      {month.habits.map(h => (
        <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: h.color, flexShrink: 0 }} />
          <span>{h.label}</span>
        </div>
      ))}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, lineHeight: 1 }}>🔥</span>
        <span>Todos los hábitos</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="9" height="9" viewBox="0 0 14 14" fill="var(--accent)">
          <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z"/>
        </svg>
        <span>Día destacado</span>
      </div>
    </div>
  )
}

// Hitos del mes — solo lectura, muestra los objetivos conseguidos o no
function MilestonesAchieved({ month }: { month: Month }) {
  const goals = month.goals || []
  const done = goals.filter(g => g.done).length
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 22, color: 'var(--text)' }}>Hitos del mes</h3>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{done}/{goals.length}</div>
      </div>
      {goals.length === 0 ? (
        <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
          Aún no has definido hitos. Añádelos desde «Editar».
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {goals.map(g => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px', borderBottom: '1px solid var(--line-soft)' }}>
              <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: `1.5px solid ${g.done ? 'var(--accent)' : 'var(--line-strong)'}`,
                background: g.done ? 'var(--accent)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {g.done ? (
                  <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                    <path d="M3 7.5L5.8 10L11 4.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                    <path d="M3 3l6 6M9 3l-6 6" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>
              <div style={{
                flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 500,
                color: g.done ? 'var(--text-muted)' : 'var(--text)',
                textDecoration: g.done ? 'line-through' : 'none',
              }}>
                {g.text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(sin descripción)</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Vista de estadísticas (consecución) — solo lectura ──────────────────────────
interface StatsViewProps {
  month: Month
  isMobile?: boolean
}

export function StatsView({ month, isMobile = false }: StatsViewProps) {
  const avgPct = month.habits.length
    ? Math.round(month.habits.reduce((sum, h) => sum + habitStats(month, h).pct, 0) / month.habits.length)
    : 0
  const goals = month.goals || []
  const goalsDone = goals.filter(g => g.done).length
  const goalsPct = goals.length ? Math.round((goalsDone / goals.length) * 100) : 0
  const bestStreak = month.habits.reduce((m, h) => Math.max(m, habitStreak(month, h)), 0)
  const milestoneDays = month.days.filter(d => d.milestone).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile ? 8 : 12 }}>
        <SummaryCard label="Cumplimiento" value={`${avgPct}%`} sub={`media de ${month.habits.length} hábitos`} />
        <SummaryCard label="Mejor racha" value={`${bestStreak}d`} sub="entre todos los hábitos" />
        <SummaryCard label="Hitos del mes" value={`${goalsDone}/${goals.length || 0}`} sub={`${goalsPct}% completado`} />
        <SummaryCard label="Días destacados" value={milestoneDays} sub="marcados con ★" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <StatsCalendar month={month} />
        <StatsLegend month={month} isMobile={isMobile} />
      </div>
      <div>
        <SectionLabel>Estadísticas por hábito</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: 12 }}>
          {month.habits.length === 0
            ? <EmptyHint text="Aún no hay hábitos. Añádelos desde «Editar»." />
            : month.habits.map(h => <OverviewStatTile key={h.id} habit={h} month={month} />)}
        </div>
      </div>
      <MilestonesAchieved month={month} />
      <MonthMilestones month={month} />
    </div>
  )
}

// ── Vista de edición — hábitos e hitos del mes ──────────────────────────────────
interface EditViewProps {
  month: Month
  onHabitsChange: (habits: Habit[], days?: Day[]) => void
  onGoalsChange: (goals: Goal[]) => void
  isMobile?: boolean
}

export function EditView({ month, onHabitsChange, onGoalsChange, isMobile = false }: EditViewProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <HabitEditor month={month} onHabitsChange={onHabitsChange} isMobile={isMobile} />
      <GoalsChecklist month={month} onGoalsChange={onGoalsChange} />
    </div>
  )
}

// Re-export MONTHS_ES for use in App
export { MONTHS_ES }
