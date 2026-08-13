import { useState, useEffect, useRef, type Ref } from 'react'
import { WEEKDAYS_LONG, cycleCheck } from '../data'
import type { Month, Day, Habit } from '../types'
import { TextCheckInput } from './TextCheckModal'

const PLACEHOLDERS_WEEKDAY = [
  'Cuéntame, ¿cómo ha ido hoy? 👀',
  '¿Qué ha sido lo más destacado del día? 📝',
  '¿Cómo ha ido la jornada? ☕',
  '¿Algo que contar de hoy? 💬',
  '¿Qué tal ha salido el día? ✨',
  '¿Qué me llevaría de hoy? 🌿',
  '¿Hubo algún momento que mereció la pena? 🔍',
  '¿Qué ha marcado la diferencia hoy? 💡',
  '¿Cómo te ha tratado el día? 🗓️',
]

const PLACEHOLDERS_WEEKEND = [
  '¿Qué tal todo por ahí? 🙂',
  '¿Día tranquilo o movidito? Cuéntame 📝',
  '¿Qué ha sido lo más épico de hoy? 🚀',
  '¿Cómo ha ido el finde? ☀️',
  '¿Algo especial para recordar? 🎉',
  '¿Qué plan ha salido bien hoy? 🏖️',
]

function getPlaceholder(weekday: number, day: number): string {
  const isWeekend = weekday === 0 || weekday === 6
  const pool = isWeekend ? PLACEHOLDERS_WEEKEND : PLACEHOLDERS_WEEKDAY
  return pool[day % pool.length]
}

// ── Editor de nota ─────────────────────────────────────────────────────────────
// El campo del diario es de una sola línea: cuando el texto no cabe entero (muy
// habitual en móvil) resulta ilegible, así que se abre aquí a pantalla completa
// para poder releerlo y editarlo cómodamente.
function NoteEditor({ dayLabel, value, placeholder, onConfirm, onCancel }: {
  dayLabel: string
  value: string
  placeholder: string
  onConfirm: (v: string) => void
  onCancel: () => void
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div onClick={onCancel} style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '20px 20px 16px', maxWidth: 460, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
          {dayLabel}
        </div>
        <textarea
          ref={ref}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onConfirm(draft) }}
          placeholder={placeholder}
          rows={7}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 150,
            borderRadius: 12, border: '1px solid var(--line-strong)',
            background: 'var(--surface-alt)', padding: '12px 14px',
            fontFamily: 'Inter, sans-serif', fontSize: 15, lineHeight: 1.55,
            color: 'var(--text)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'transparent',
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(draft)} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10,
            border: 'none', background: 'var(--accent)',
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer',
          }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}

function DayCard({ day, habits, selected, isToday, onUpdate, onSelect, innerRef }: {
  day: Day
  habits: Habit[]
  selected: boolean
  isToday: boolean
  onUpdate: (mut: Partial<Day>) => void
  onSelect: () => void
  innerRef?: Ref<HTMLDivElement>
}) {
  const wd = WEEKDAYS_LONG[day.weekday]
  const stColor = day.status === 'holiday' ? 'var(--c-festivo)' :
    day.status === 'vacation' ? 'var(--c-vacaciones)' : 'transparent'
  const [textCheckHabit, setTextCheckHabit] = useState<Habit | null>(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const highlightRef = useRef<HTMLInputElement>(null)

  // Si el texto desborda el ancho visible del campo no se puede leer entero:
  // en ese caso lo abrimos como nota en vez de editarlo en una sola línea.
  // Medimos el desbordamiento real en lugar de contar caracteres, así se adapta
  // solo al ancho de cada pantalla.
  const openNoteIfClipped = () => {
    const el = highlightRef.current
    if (!el || el.scrollWidth <= el.clientWidth + 1) return
    el.blur()
    setNoteOpen(true)
  }

  const allDone = habits.length > 0 && habits.every(h => {
    const v = day.habits[h.id]
    return h.type === 'check' ? v === 1
      : h.type === 'text-check' ? (typeof v === 'string' && v.length > 0)
      : (Number(v) || 0) >= (h.goal ?? 0)
  })

  return (
    <>
    {textCheckHabit && (
      <TextCheckInput
        habitLabel={textCheckHabit.label}
        currentValue={String(day.habits[textCheckHabit.id] || '')}
        color={textCheckHabit.color}
        onConfirm={v => { onUpdate({ habits: { ...day.habits, [textCheckHabit.id]: v } }); setTextCheckHabit(null) }}
        onCancel={() => setTextCheckHabit(null)}
      />
    )}
    {noteOpen && (
      <NoteEditor
        dayLabel={`${wd} ${day.day}`}
        value={day.highlight}
        placeholder={getPlaceholder(day.weekday, day.day)}
        onConfirm={v => { onUpdate({ highlight: v }); setNoteOpen(false) }}
        onCancel={() => setNoteOpen(false)}
      />
    )}
    <div ref={innerRef} onClick={onSelect} style={{
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
        {allDone && <span style={{ fontSize: 13, lineHeight: 1, marginTop: 2 }}>🔥</span>}
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {day.milestone && (
            <svg width="13" height="13" viewBox="0 0 14 14" fill="var(--accent)">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z"/>
            </svg>
          )}
          <input ref={highlightRef} value={day.highlight} onChange={e => onUpdate({ highlight: e.target.value })}
            placeholder={getPlaceholder(day.weekday, day.day)}
            onClick={e => { e.stopPropagation(); openNoteIfClipped() }}
            onFocus={openNoteIfClipped}
            style={{ flex: 1, minWidth: 0, textOverflow: 'ellipsis', border: 'none', outline: 'none', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 14.5, color: day.highlight ? 'var(--text)' : 'var(--text-muted)', padding: 0 }}
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
                  e.stopPropagation()
                  setTextCheckHabit(h)
                } else {
                  const next = prompt(`${h.label} (meta: ${h.goal})`, String(v || 0))
                  if (next !== null) {
                    const n = parseInt(next.replace(/[^\d]/g, ''), 10)
                    onUpdate({ habits: { ...day.habits, [h.id]: isNaN(n) ? 0 : n } })
                  }
                }
              }} title={h.label} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 999,
                border: `1px solid ${tinted ? h.color : 'var(--line)'}`,
                background: tinted ? `color-mix(in oklab, ${h.color} ${ok ? 16 : 8}%, transparent)` : 'transparent',
                fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 500,
                color: tinted ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer',
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: tinted ? h.color : 'var(--line-strong)' }} />
                {/* En text-check el texto escrito sustituye al nombre del hábito: es
                    el dato que interesa de un vistazo. El punto de color (y el title)
                    siguen identificando de qué hábito se trata. */}
                {h.type === 'text-check' && ok ? (
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, letterSpacing: '0.04em', color: h.color }}>{String(v)}</span>
                ) : (
                  <span>{h.short}</span>
                )}
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
    </>
  )
}

interface JournalLayoutProps {
  month: Month
  /**
   * Notifica el cambio de UN día. La vista no puede tocar nada más del mes:
   * ni otros días, ni hábitos, ni hitos. Antes recibía un `setMonth` con el que
   * cualquier edición reescribía el mes entero en el servidor.
   */
  onDayChange: (day: number, patch: Partial<Day>) => void
  density: string
  isMobile?: boolean
}

export function JournalLayout({ month, onDayChange, density, isMobile = false }: JournalLayoutProps) {
  const _today = new Date()
  const todayDay = (month.year === _today.getFullYear() && month.month === _today.getMonth())
    ? _today.getDate() : null
  const [selected, setSelected] = useState<number | null>(todayDay)

  // Al abrir un mes en curso, centramos la vista en el día de hoy
  const todayCardRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setSelected(todayDay)
    if (todayDay && todayCardRef.current) {
      todayCardRef.current.scrollIntoView({ block: 'center' })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month.year, month.month])

  // Un mes sin días (p. ej. dato corrupto) no debe romper la app
  if (!month.days || month.days.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'Inter, sans-serif', fontSize: 13.5, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14 }}>
        Este mes no tiene días registrados.
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: density === 'compact' ? 6 : 10 }}>
        {month.days.map(d => (
          <DayCard key={d.day} day={d} habits={month.habits}
            innerRef={d.day === todayDay ? todayCardRef : undefined}
            selected={selected === d.day} isToday={d.day === todayDay}
            onSelect={() => setSelected(d.day)}
            onUpdate={patch => onDayChange(d.day, patch)}
          />
        ))}
      </div>
    </div>
  )
}
