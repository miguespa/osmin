import { useState } from 'react'
import { WEEKDAYS_LONG, cycleCheck } from '../data'
import type { Month, Day, Habit } from '../types'

function MiniCalendar({ month, selectedDay, onSelectDay, todayDay }: {
  month: Month
  selectedDay: number | null
  onSelectDay: (d: number) => void
  todayDay: number | null
}) {
  const firstDay = month.days[0].weekday
  const offset = firstDay === 0 ? 6 : firstDay - 1
  const cells: (Day | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (const d of month.days) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  const wdHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
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
          const sel = selectedDay === d.day
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
          return (
            <button key={i} onClick={() => onSelectDay(d.day)} style={{
              aspectRatio: '1', padding: 4,
              background: isToday && bg === 'transparent'
                ? `color-mix(in oklab, var(--accent) 10%, var(--surface))` : bg,
              border: sel ? '1.5px solid var(--text)' : isToday ? '1.5px solid var(--accent)' : '1px solid var(--line-soft)',
              borderRadius: 8, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
              position: 'relative',
            }}>
              <div style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: 12, fontWeight: 600,
                color: bg !== 'transparent' ? '#1a1a1a' : isToday ? 'var(--accent)' : 'var(--text)',
                fontVariantNumeric: 'tabular-nums',
              }}>{d.day}</div>
              {d.milestone && <div style={{ position: 'absolute', top: 3, right: 3, width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} />}
              <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                {habitDots.map((c, j) => (
                  <div key={j} style={{ width: 5, height: 5, borderRadius: '50%', background: c || 'transparent', border: c ? 'none' : '1px solid var(--line)' }} />
                ))}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DayCard({ day, habits, selected, isToday, onUpdate, onSelect }: {
  day: Day
  habits: Habit[]
  selected: boolean
  isToday: boolean
  onUpdate: (mut: Partial<Day>) => void
  onSelect: () => void
}) {
  const wd = WEEKDAYS_LONG[day.weekday]
  const stColor = day.status === 'holiday' ? 'var(--c-festivo)' :
    day.status === 'vacation' ? 'var(--c-vacaciones)' : 'transparent'

  return (
    <div onClick={onSelect} style={{
      background: isToday ? `color-mix(in oklab, var(--accent) 5%, var(--surface))` : 'var(--surface)',
      border: selected ? '1.5px solid var(--text)' : isToday ? '1.5px solid var(--accent)' : '1px solid var(--line)',
      borderRadius: 12, padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: 14,
    }}>
      <div style={{ flexShrink: 0, width: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2, gap: 2 }}>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 26, fontWeight: 600, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: isToday ? 'var(--accent)' : 'var(--text)' }}>
          {String(day.day).padStart(2, '0')}
        </div>
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {wd.slice(0, 3)}
        </div>
        {stColor !== 'transparent' && <div style={{ width: 24, height: 4, borderRadius: 2, background: stColor, marginTop: 4 }} />}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {day.milestone && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="var(--accent)">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z"/>
            </svg>
          )}
          <input value={day.highlight} onChange={e => onUpdate({ highlight: e.target.value })}
            placeholder="Escribe el highlight del día…" onClick={e => e.stopPropagation()}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 14.5, color: day.highlight ? 'var(--text)' : 'var(--text-muted)', padding: 0 }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {habits.map(h => {
            const v = day.habits[h.id]
            const ok = h.type === 'check' ? v === 1
              : h.type === 'text-check' ? (typeof v === 'string' && v.length > 0)
              : (Number(v) || 0) >= (h.goal ?? 0)
            const tinted = h.type === 'check' ? v === 1
              : h.type === 'text-check' ? (typeof v === 'string' && v.length > 0)
              : Number(v) > 0
            return (
              <button key={h.id} onClick={e => {
                e.stopPropagation()
                if (h.type === 'check') {
                  onUpdate({ habits: { ...day.habits, [h.id]: cycleCheck(v as number) } })
                } else if (h.type === 'text-check') {
                  const next = prompt(`${h.label} (máx. 3 letras)`, String(v || ''))
                  if (next !== null) onUpdate({ habits: { ...day.habits, [h.id]: next.trim().toUpperCase().slice(0, 3) } })
                } else {
                  const next = prompt(`${h.label} (meta: ${h.goal})`, String(v || 0))
                  if (next !== null) {
                    const n = parseInt(next.replace(/[^\d]/g, ''), 10)
                    onUpdate({ habits: { ...day.habits, [h.id]: isNaN(n) ? 0 : n } })
                  }
                }
              }} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${tinted ? h.color : 'var(--line)'}`,
                background: tinted ? `color-mix(in oklab, ${h.color} ${ok ? 16 : 8}%, transparent)` : 'transparent',
                fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 500,
                color: tinted ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: tinted ? h.color : 'var(--line-strong)' }} />
                <span>{h.short}</span>
                {h.type === 'numeric' && (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontVariantNumeric: 'tabular-nums', color: tinted ? 'var(--text)' : 'var(--text-muted)' }}>
                    {v ? v.toLocaleString('es') : '—'}
                  </span>
                )}
                {v === -1 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>skip</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

interface JournalLayoutProps {
  month: Month
  setMonth: (updater: Month | ((prev: Month) => Month)) => void
  density: string
  isMobile?: boolean
}

export function JournalLayout({ month, setMonth, density, isMobile = false }: JournalLayoutProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const _today = new Date()
  const todayDay = (month.year === _today.getFullYear() && month.month === _today.getMonth())
    ? _today.getDate() : null

  // Un mes sin días (p. ej. dato corrupto) no debe romper la app
  if (!month.days || month.days.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: 13.5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
        Este mes no tiene días registrados.
      </div>
    )
  }

  const updateDay = (day: number, mut: Partial<Day>) => {
    setMonth(m => {
      const next = { ...m, days: m.days.slice() }
      next.days[day - 1] = { ...next.days[day - 1], ...mut }
      return next
    })
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: isMobile ? 12 : 16, alignItems: 'flex-start' }}>
      <div style={{ position: isMobile ? 'static' : 'sticky', top: 0 }}>
        <MiniCalendar month={month} selectedDay={selected} onSelectDay={setSelected} todayDay={todayDay} />
        {!isMobile && (
        <div style={{ marginTop: 12, padding: 14, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>Leyenda</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--c-festivo)' }} />
            <span>Festivo / fin de semana</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 14, height: 10, borderRadius: 3, background: 'var(--c-vacaciones)' }} />
            <span>Vacaciones</span>
          </div>
          {month.habits.map(h => (
            <div key={h.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: h.color }} />
              <span>{h.label}</span>
            </div>
          ))}
        </div>
        )}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 6 : 10 }}>
        {month.days.map(d => (
          <DayCard key={d.day} day={d} habits={month.habits}
            selected={selected === d.day} isToday={d.day === todayDay}
            onSelect={() => setSelected(d.day)}
            onUpdate={mut => updateDay(d.day, mut)}
          />
        ))}
      </div>
    </div>
  )
}
