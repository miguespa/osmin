import { useState, useEffect } from 'react'
import { WEEKDAYS_ES, cycleCheck, cycleStatus } from '../data'
import type { Month, Habit } from '../types'

function StatusBand({ status }: { status: string }) {
  const colors: Record<string, string> = { work: 'transparent', holiday: 'var(--c-festivo)', vacation: 'var(--c-vacaciones)' }
  return (
    <div style={{
      width: 6, alignSelf: 'stretch', borderRadius: 3,
      background: colors[status] ?? 'transparent',
      opacity: status === 'work' ? 0 : 1,
    }} />
  )
}

function CheckCell({ value, color, onClick }: { value: number; color: string; onClick: () => void }) {
  const fill = value === 1 ? color : 'transparent'
  const border = value === -1 ? 'var(--line-strong)' : (value === 1 ? color : 'var(--line)')
  return (
    <button onClick={onClick} className="osmin-cell" style={{
      width: 28, height: 28, borderRadius: 8,
      border: `1.5px solid ${border}`, background: fill,
      cursor: 'pointer', padding: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'all 120ms ease',
    }}>
      {value === 1 && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.5L5.8 10L11 4.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {value === -1 && <div style={{ width: 10, height: 1.5, background: 'var(--text-muted)' }} />}
    </button>
  )
}

function TextCheckCell({ value, color, onChange }: { value: string; color: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])

  const commit = () => {
    onChange(draft.trim().toUpperCase().slice(0, 3))
    setEditing(false)
  }

  const isDone = value.length > 0

  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={e => setDraft(e.target.value.toUpperCase().slice(0, 3))}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
        style={{
          width: 52, height: 28, borderRadius: 8,
          border: `1.5px solid ${color}`, padding: '0 4px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
          textAlign: 'center', background: 'var(--surface)',
          color: 'var(--text)', outline: 'none', textTransform: 'uppercase',
        }}
      />
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="osmin-cell" style={{
      width: 52, height: 28, borderRadius: 8,
      border: `1.5px solid ${isDone ? color : 'var(--line)'}`,
      background: isDone ? `color-mix(in oklab, ${color} 18%, transparent)` : 'transparent',
      cursor: 'pointer', padding: 0,
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 700,
      color: isDone ? color : 'var(--line-strong)',
      letterSpacing: '0.04em',
    }}>
      {isDone ? value : <span style={{ fontSize: 9, opacity: 0.4 }}>···</span>}
    </button>
  )
}

function NumericCell({ value, goal, color, onChange }: { value: number; goal: number; color: string; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value || ''))
  useEffect(() => setDraft(String(value || '')), [value, editing])

  const pct = goal ? Math.min(1, value / goal) : 0
  const hit = value >= goal && value > 0

  const commit = () => {
    const n = parseInt(draft.replace(/[^\d]/g, ''), 10)
    onChange(isNaN(n) ? 0 : n)
    setEditing(false)
  }

  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{
          width: 60, height: 28, borderRadius: 8,
          border: `1.5px solid ${color}`, padding: '0 6px',
          fontFamily: 'JetBrains Mono, monospace', fontSize: 12,
          textAlign: 'center', background: 'var(--surface)',
          color: 'var(--text)', outline: 'none',
        }}
      />
    )
  }

  return (
    <button onClick={() => setEditing(true)} className="osmin-cell" style={{
      width: 60, height: 28, borderRadius: 8,
      border: `1.5px solid ${value > 0 ? color : 'var(--line)'}`,
      background: value > 0 ? `color-mix(in oklab, ${color} ${hit ? 18 : 8}%, transparent)` : 'transparent',
      cursor: 'pointer', padding: 0, position: 'relative', overflow: 'hidden',
      fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5,
      fontVariantNumeric: 'tabular-nums',
      color: value > 0 ? 'var(--text)' : 'var(--text-muted)',
      fontWeight: hit ? 600 : 500,
    }}>
      <div style={{ position: 'absolute', left: 0, bottom: 0, height: 2, width: `${pct * 100}%`, background: color, opacity: 0.5 }} />
      <span style={{ position: 'relative' }}>{value > 0 ? value.toLocaleString('es') : '—'}</span>
    </button>
  )
}

export function HighlightInput({ value, milestone, onChange, onToggleMilestone }: { value: string; milestone: boolean; onChange: (v: string) => void; onToggleMilestone: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <button onClick={onToggleMilestone} title="Marcar como hito del mes" style={{
        width: 18, height: 18, padding: 0, border: 'none',
        background: 'transparent', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: milestone ? 1 : 0.25, transition: 'opacity 120ms',
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14"
          fill={milestone ? 'var(--accent)' : 'none'}
          stroke={milestone ? 'var(--accent)' : 'var(--text-muted)'} strokeWidth="1.5">
          <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z" strokeLinejoin="round"/>
        </svg>
      </button>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder=""
        style={{
          flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--text)', padding: '4px 0',
        }}
      />
    </div>
  )
}

interface TableLayoutProps {
  month: Month
  setMonth: (updater: Month | ((prev: Month) => Month)) => void
  density: string
}

export function TableLayout({ month, setMonth, density }: TableLayoutProps) {
  const rowH = density === 'compact' ? 30 : 38
  const _today = new Date()
  const todayDay = (month.year === _today.getFullYear() && month.month === _today.getMonth())
    ? _today.getDate() : null

  const updateDay = (idx: number, mut: (d: typeof month.days[0]) => Partial<typeof month.days[0]>) => {
    setMonth(m => {
      const next = { ...m, days: m.days.slice() }
      next.days[idx] = { ...next.days[idx], ...mut(next.days[idx]) }
      return next
    })
  }
  const updateHabit = (idx: number, hid: string, val: number | string) =>
    updateDay(idx, d => ({ habits: { ...d.habits, [hid]: val } }))

  const cols = `64px 1fr ${month.habits.map((h: Habit) => h.type === 'numeric' ? '76px' : h.type === 'text-check' ? '52px' : '44px').join(' ')} 24px`

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'clip', marginTop: 20 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: cols,
        alignItems: 'center', gap: 8, padding: '11px 16px',
        borderBottom: '1px solid var(--line-strong)',
        background: 'color-mix(in oklab, var(--line) 55%, var(--surface))',
        fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 600,
        color: 'var(--text-soft)', textTransform: 'uppercase', letterSpacing: '0.06em',
        position: 'sticky', top: 0, zIndex: 3,
        boxShadow: '0 6px 12px -6px rgba(0,0,0,0.18)',
      }}>
        <div>Día</div>
        <div>Highlight</div>
        {month.habits.map(h => <div key={h.id} style={{ textAlign: 'center', color: h.color }}>{h.short}</div>)}
        <div />
      </div>

      {month.days.map((d, idx) => {
        const wd = WEEKDAYS_ES[d.weekday]
        const isWeekend = d.weekday === 0 || d.weekday === 6
        const isToday = d.day === todayDay
        const stripeBg = isToday
          ? `color-mix(in oklab, var(--accent) 6%, var(--surface))`
          : idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-alt)'
        return (
          <div key={d.day} style={{
            display: 'grid', gridTemplateColumns: cols,
            alignItems: 'center', minHeight: rowH, padding: '0 16px',
            borderBottom: idx === month.days.length - 1 ? 'none' : `1px solid ${isToday ? 'color-mix(in oklab, var(--accent) 20%, var(--line-soft))' : 'var(--line-soft)'}`,
            borderTop: isToday ? `1px solid color-mix(in oklab, var(--accent) 20%, var(--line-soft))` : 'none',
            background: stripeBg, gap: 8,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={() => updateDay(idx, d => ({ status: cycleStatus(d.status) }))}
                title="Cambiar estado del día"
                style={{
                  width: 26, height: 22, borderRadius: 6, padding: 0,
                  border: isToday ? '1.5px solid var(--accent)' : 'none',
                  cursor: 'pointer',
                  background: d.status === 'holiday' ? 'var(--c-festivo)' :
                    d.status === 'vacation' ? 'var(--c-vacaciones)' :
                    isToday ? `color-mix(in oklab, var(--accent) 14%, var(--surface))` : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                  color: d.status === 'work' ? (isToday ? 'var(--accent)' : 'var(--text)') : '#1a1a1a',
                }}
              >{d.day}</button>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11,
                color: isWeekend ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500,
              }}>{wd}</span>
            </div>

            <HighlightInput
              value={d.highlight} milestone={d.milestone}
              onChange={v => updateDay(idx, () => ({ highlight: v }))}
              onToggleMilestone={() => updateDay(idx, d => ({ milestone: !d.milestone }))}
            />

            {month.habits.map(h => (
              <div key={h.id} style={{ display: 'flex', justifyContent: 'center' }}>
                {h.type === 'check' ? (
                  <CheckCell value={d.habits[h.id] as number} color={h.color}
                    onClick={() => updateHabit(idx, h.id, cycleCheck(d.habits[h.id] as number))} />
                ) : h.type === 'text-check' ? (
                  <TextCheckCell value={String(d.habits[h.id] || '')} color={h.color}
                    onChange={v => updateHabit(idx, h.id, v)} />
                ) : (
                  <NumericCell value={Number(d.habits[h.id]) || 0} goal={h.goal ?? 0} color={h.color}
                    onChange={v => updateHabit(idx, h.id, v)} />
                )}
              </div>
            ))}

            <StatusBand status={d.status} />
          </div>
        )
      })}
    </div>
  )
}
