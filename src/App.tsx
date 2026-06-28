import { useState, useMemo, useEffect, useRef } from 'react'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import { buildBlankMonth, habitStats, habitStreak, MONTHS_ES } from './data'
import { TableLayout } from './components/TableLayout'
import { JournalLayout } from './components/JournalLayout'
import { OverviewView } from './components/OverviewView'
import { TweaksPanel, TweakSection, TweakRadio, TweakColor, useTweaks } from './components/TweaksPanel'
import { OnboardingFlow } from './components/OnboardingFlow'
import { makeSupabaseClient } from './lib/supabase'
import { fetchAllData, saveMonthToDB, deleteMonthFromDB, saveTweaksToDB, saveUiStateToDB, deleteAllUserData, upsertUserProfile, recordLoginEvent } from './lib/db'
import type { Month, Tweaks, LayoutType } from './types'
import logoUrl from '/logo.png'

// ── Logo ──────────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <img src={logoUrl} alt="Osmin" style={{ height: 36, width: 'auto', display: 'block', filter: 'brightness(0) invert(1) opacity(0.88)' }} />
  )
}

// ── NewMonthPicker ─────────────────────────────────────────────────────────────
function NewMonthPicker({ suggested, months, onConfirm, onCancel }: {
  suggested: { year: number; month: number }
  months: Month[]
  onConfirm: (year: number, month: number) => void
  onCancel: () => void
}) {
  const [year, setYear] = useState(suggested.year)
  const [monthIdx, setMonthIdx] = useState(suggested.month)

  return (
    <div style={{ margin: '4px 0', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderBottom: '1px solid var(--line-soft)' }}>
        <button onClick={() => setYear(y => y - 1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-alt)', color: 'var(--text-soft)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: '1' }}>‹</button>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ width: 22, height: 22, borderRadius: 6, border: '1px solid var(--line)', background: 'var(--surface-alt)', color: 'var(--text-soft)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, lineHeight: '1' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, padding: '8px' }}>
        {MONTHS_ES.map((name, i) => {
          const sel = i === monthIdx
          const alreadyExists = months.some(m => m.year === year && m.month === i)
          return (
            <button key={i} onClick={() => !alreadyExists && setMonthIdx(i)} title={alreadyExists ? 'Ya existe este mes' : name} style={{ padding: '5px 2px', borderRadius: 6, border: sel ? '1.5px solid var(--accent)' : '1px solid transparent', background: sel ? `color-mix(in oklab, var(--accent) 14%, var(--surface))` : 'transparent', cursor: alreadyExists ? 'not-allowed' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: sel ? 600 : 500, color: alreadyExists ? 'var(--text-muted)' : sel ? 'var(--text)' : 'var(--text-soft)', opacity: alreadyExists ? 0.4 : 1, textAlign: 'center' }}>
              {name.slice(0, 3)}
            </button>
          )
        })}
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '0 8px 8px' }}>
        <button onClick={onCancel} style={{ flex: 1, height: 26, borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 500, color: 'var(--text-muted)' }}>Cancelar</button>
        <button onClick={() => onConfirm(year, monthIdx)} style={{ flex: 1, height: 26, borderRadius: 7, border: 'none', background: 'var(--accent)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 600, color: '#fff' }}>Crear</button>
      </div>
    </div>
  )
}

// ── Sidebar ────────────────────────────────────────────────────────────────────
function Sidebar({ months, activeIdx, setActiveIdx, addMonth, deleteMonth, view, setView, onOpenAccount, onOpenTweaks, onViewHabits }: {
  months: Month[]
  activeIdx: number
  setActiveIdx: (i: number) => void
  addMonth: (year: number, month: number) => void
  deleteMonth: (idx: number) => void
  view: string
  setView: (v: string) => void
  onOpenAccount: () => void
  onOpenTweaks: () => void
  onViewHabits: () => void
}) {
  const { user } = useUser()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [picker, setPicker] = useState<{ year: number; month: number } | null>(null)
  const [showTip, setShowTip] = useState(() => !localStorage.getItem('osmin_tip_dismissed'))
  const month = months[activeIdx]

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? 'usuario'
  const userInitial = user?.firstName?.[0]?.toUpperCase() ?? userEmail[0].toUpperCase()

  const dismissTip = () => {
    localStorage.setItem('osmin_tip_dismissed', '1')
    setShowTip(false)
  }

  const openPicker = () => {
    const last = months[months.length - 1]
    let m = last.month + 1, y = last.year
    if (m > 11) { m = 0; y++ }
    while (months.some(mo => mo.year === y && mo.month === m)) {
      m++; if (m > 11) { m = 0; y++ }
    }
    setPicker({ year: y, month: m })
  }

  const item = (id: string, label: string, count?: number) => {
    const sel = view === id
    return (
      <button key={id} onClick={() => setView(id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', background: sel ? 'var(--sidebar-sel)' : 'transparent', color: sel ? 'var(--text)' : 'var(--text-soft)', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: sel ? 600 : 500, width: '100%' }}>
        <span>{label}</span>
        {count !== undefined && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>}
      </button>
    )
  }

  const sectionTitle = (t: string) => (
    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '14px 10px 6px' }}>{t}</div>
  )

  return (
    <aside style={{ width: 224, flexShrink: 0, background: 'var(--sidebar)', borderRight: '1px solid var(--line)', display: 'flex', flexDirection: 'column', padding: '0 10px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '14px 10px 16px' }}>
        <Logo />
      </div>

      {sectionTitle('Vista')}
      {item('month', 'Mes actual')}
      {item('year', `Año ${month.year}`)}
      <button onClick={() => { setView('habits'); onViewHabits() }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', background: view === 'habits' ? 'var(--sidebar-sel)' : 'transparent', color: view === 'habits' ? 'var(--text)' : 'var(--text-soft)', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: view === 'habits' ? 600 : 500, width: '100%' }}>
        <span>Hábitos</span>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{month.habits.length}</span>
      </button>
      {item('stats', 'Estadísticas')}

      {sectionTitle('Meses')}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {months.map((m, i) => {
          const sel = i === activeIdx
          const hovered = hoveredIdx === i
          return (
            <div key={`${m.year}-${m.month}`} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button onClick={() => setActiveIdx(i)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', paddingRight: hovered && months.length > 1 ? 30 : 10, borderRadius: 7, border: 'none', cursor: 'pointer', textAlign: 'left', background: sel ? 'var(--sidebar-sel)' : 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: sel ? 'var(--text)' : 'var(--text-soft)', fontWeight: sel ? 600 : 500 }}>
                <span>{MONTHS_ES[m.month]} '{String(m.year).slice(2)}</span>
                {!hovered && <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10, color: 'var(--text-muted)' }}>{m.days.length}</span>}
              </button>
              {hovered && months.length > 1 && (
                <button onClick={e => { e.stopPropagation(); deleteMonth(i) }} title="Eliminar mes" style={{ position: 'absolute', right: 8, width: 18, height: 18, borderRadius: 5, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>
          )
        })}
        {picker ? (
          <NewMonthPicker suggested={picker} months={months} onConfirm={(y, m) => { addMonth(y, m); setPicker(null) }} onCancel={() => setPicker(null)} />
        ) : (
          <button onClick={openPicker} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 7, marginTop: 2, border: 'none', cursor: 'pointer', textAlign: 'left', background: 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)', fontWeight: 500, width: '100%' }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Nuevo mes
          </button>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {showTip && (
        <div style={{ padding: '11px 12px', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)', fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.45, position: 'relative', marginBottom: 8 }}>
          <button onClick={dismissTip} title="Cerrar" style={{ position: 'absolute', top: 8, right: 8, width: 18, height: 18, border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', borderRadius: 4 }}>
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 1l7 7M8 1l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, paddingRight: 18 }}>Tip</div>
          Click en un día para cambiar entre laborable, festivo y vacaciones.
        </div>
      )}

      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onOpenAccount} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', transition: 'background 140ms, border-color 140ms', minWidth: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-alt)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, #4ECDC4, #1F8A5B)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>{userInitial}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userEmail}</div>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, color: 'var(--text-muted)' }}>Acceso anticipado</div>
          </div>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--text-muted)" strokeWidth="1.4" strokeLinecap="round"><path d="M4.5 2l4 4-4 4"/></svg>
        </button>
        <button onClick={onOpenTweaks} title="Ajustes visuales (⌘,)" style={{ width: 34, height: 'auto', borderRadius: 9, border: '1px solid var(--line)', background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', flexShrink: 0, transition: 'background 140ms' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-alt)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
            <circle cx="7" cy="7" r="2"/>
            <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.9 2.9l1.06 1.06M10.04 10.04l1.06 1.06M2.9 11.1l1.06-1.06M10.04 3.96l1.06-1.06"/>
          </svg>
        </button>
      </div>
    </aside>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-soft)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--c-festivo)' }} /> Festivo
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 12, height: 8, borderRadius: 2, background: 'var(--c-vacaciones)' }} /> Vacaciones
      </div>
    </div>
  )
}

// ── MonthHeader ────────────────────────────────────────────────────────────────
function MonthHeader({ month, layout, setLayout, onPrev, onNext, viewMode, setViewMode, onEditHabits }: {
  month: Month
  layout: LayoutType
  setLayout: (l: LayoutType) => void
  onPrev: () => void
  onNext: () => void
  viewMode: 'month' | 'overview'
  setViewMode: (m: 'month' | 'overview') => void
  onEditHabits: () => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '24px 28px 18px', borderBottom: '1px solid var(--line)' }}>
      <div>
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Mes activo</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <button onClick={onPrev} className="month-nav">‹</button>
          <h1 style={{ margin: 0, fontFamily: 'Instrument Serif, serif', fontWeight: 400, fontSize: 44, lineHeight: 1, color: 'var(--text)', letterSpacing: '-0.01em' }}>
            {MONTHS_ES[month.month]}
            <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontFamily: 'JetBrains Mono, monospace', fontSize: 22, letterSpacing: 0 }}>'{String(month.year).slice(2)}</span>
          </h1>
          <button onClick={onNext} className="month-nav">›</button>
          <button onClick={() => setViewMode(viewMode === 'overview' ? 'month' : 'overview')} className="overview-btn" data-active={viewMode === 'overview'} title="Resumen del mes">
            <svg width="13" height="13" viewBox="0 0 14 14" fill={viewMode === 'overview' ? 'var(--accent)' : 'none'} stroke={viewMode === 'overview' ? 'var(--accent)' : 'currentColor'} strokeWidth="1.5" strokeLinejoin="round">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z" />
            </svg>
            <span>Resumen del mes</span>
          </button>
          <button onClick={onEditHabits} title="Editar hábitos" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: '1.5px solid rgba(201,122,42,.45)', background: 'rgba(201,122,42,.1)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#C97A2A', letterSpacing: '0.01em', transition: 'background 140ms, border-color 140ms' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,122,42,.18)'; e.currentTarget.style.borderColor = 'rgba(201,122,42,.7)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,122,42,.1)'; e.currentTarget.style.borderColor = 'rgba(201,122,42,.45)' }}
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 10.5V12h1.5l5.5-5.5-1.5-1.5L2 10.5zM11.5 3.5a1.06 1.06 0 000-1.5l-1-1a1.06 1.06 0 00-1.5 0L8 2.5 9.5 4l2-1.5z"/>
            </svg>
            Editar hábitos
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', visibility: viewMode === 'overview' ? 'hidden' : 'visible' }}>
        <Legend />
        <div style={{ display: 'inline-flex', padding: 3, background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: 9 }}>
          {([{ id: 'table', label: 'Tabla' }, { id: 'journal', label: 'Bitácora' }] as { id: LayoutType; label: string }[]).map(o => (
            <button key={o.id} onClick={() => setLayout(o.id)} style={{ padding: '6px 14px', background: layout === o.id ? 'var(--surface)' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 7, fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: layout === o.id ? 600 : 500, color: layout === o.id ? 'var(--text)' : 'var(--text-muted)', boxShadow: layout === o.id ? '0 1px 2px rgba(0,0,0,0.06)' : 'none' }}>{o.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── StatTile ───────────────────────────────────────────────────────────────────
function StatTile({ habit, month }: { habit: Month['habits'][0]; month: Month }) {
  const stats = habitStats(month, habit)
  const streak = habitStreak(month, habit)
  return (
    <div style={{ flex: 1, minWidth: 0, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: habit.color }} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: 'var(--text)', letterSpacing: '0.01em' }}>{habit.label}</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
          {habit.type === 'numeric' ? `meta ${(habit.goal ?? 0).toLocaleString('es')}` : 'check'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 32, lineHeight: 1, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
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

// ── MilestonesStrip ────────────────────────────────────────────────────────────
function MilestonesStrip({ month }: { month: Month }) {
  const ms = month.days.filter(d => d.milestone)
  if (ms.length === 0) return null
  return (
    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10.5, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>Hitos del mes</div>
      <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)' }} />
      <div style={{ display: 'flex', gap: 18, flex: 1, overflow: 'hidden', flexWrap: 'wrap' }}>
        {ms.map(d => (
          <div key={d.day} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <svg width="11" height="11" viewBox="0 0 14 14" fill="var(--accent)">
              <path d="M7 1.5L8.7 5l3.8.5-2.8 2.6.7 3.8L7 10.1 3.6 12l.7-3.8L1.5 5.5 5.3 5z"/>
            </svg>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{String(d.day).padStart(2, '0')}</span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text)', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>{d.highlight}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── AccountPanel ───────────────────────────────────────────────────────────────
function AccountPanel({ months, onClose, onLogout, onDeleteAccount }: {
  months: Month[]
  onClose: () => void
  onLogout: () => void
  onDeleteAccount: () => Promise<void>
}) {
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? 'usuario'
  const userInitial = user?.firstName?.[0]?.toUpperCase() ?? userEmail[0].toUpperCase()
  const joinFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  useEffect(() => {
    if (!document.getElementById('osmin-ac-styles')) {
      const s = document.createElement('style')
      s.id = 'osmin-ac-styles'
      s.textContent = `
        @keyframes acOverlayIn { from { opacity:0 } to { opacity:1 } }
        @keyframes acPanelIn   { from { transform:translateX(100%) } to { transform:translateX(0) } }
      `
      document.head.appendChild(s)
    }
  }, [])

  const stats = useMemo(() => {
    const totalMonths = months.length
    const habitSet = new Set<string>()
    months.forEach(m => m.habits?.forEach(h => habitSet.add(h.label)))
    let totalDays = 0, doneDays = 0
    months.forEach(m => {
      m.days?.forEach(d => {
        totalDays++
        const hasAny = m.habits?.some(h => {
          const v = d.habits?.[h.id]
          return h.type === 'check' ? v === 1
            : h.type === 'text-check' ? (typeof v === 'string' && v.length > 0)
            : (Number(v) || 0) >= (h.goal || 1)
        })
        if (hasAny) doneDays++
      })
    })
    return { months: totalMonths, habits: habitSet.size, days: doneDays, pct: totalDays ? Math.round((doneDays / totalDays) * 100) : 0 }
  }, [months])

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500) }

  const handleExport = () => {
    try {
      const blob = new Blob([JSON.stringify({ months }, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url; a.download = `osmin-datos-${new Date().toISOString().slice(0, 10)}.json`
      a.click(); URL.revokeObjectURL(url)
      showToast('Datos exportados correctamente')
    } catch { showToast('Error al exportar') }
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDeleteAccount()
  }

  const FEATURES = ['Seguimiento de hábitos', 'Bitácora diaria', 'Estadísticas del mes', 'Vista de highlights', 'Exportación de datos', 'Acceso anticipado']

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 40, background: 'rgba(0,0,0,0.48)', backdropFilter: 'blur(3px)', animation: 'acOverlayIn 200ms ease forwards' }} />
      <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, zIndex: 50, width: 400, maxWidth: '95vw', background: 'var(--bg-app)', borderLeft: '1px solid var(--line)', display: 'flex', flexDirection: 'column', overflowY: 'auto', boxShadow: '-20px 0 60px rgba(0,0,0,.4)', animation: 'acPanelIn 260ms cubic-bezier(.3,.7,.4,1) forwards' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--line)', position: 'sticky', top: 0, background: 'var(--bg-app)', zIndex: 2 }}>
          <img src={logoUrl} alt="Osmin" style={{ height: 22, filter: 'brightness(0) invert(1) opacity(.88)' }} />
          <button onClick={onClose} style={{ width: 30, height: 30, border: '1px solid var(--line)', background: 'transparent', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M1 1l9 9M10 1L1 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>

        <div style={{ padding: '20px 20px 40px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'linear-gradient(135deg, #4ECDC4 0%, #1F8A5B 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#fff' }}>{userInitial}</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{userEmail}</div>
              <div style={{ marginTop: 6 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 9.5, fontWeight: 600, color: '#4ECDC4', background: 'rgba(78,205,196,.1)', border: '1px solid rgba(78,205,196,.25)', borderRadius: 5, padding: '2px 8px', letterSpacing: '.05em' }}>ACCESO ANTICIPADO</span>
              </div>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 7 }}>Miembro desde {joinFormatted}</div>
            </div>
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>Plan actual</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text-muted)', textDecoration: 'line-through' }}>5€/mes</span>
                <span style={{ fontFamily: 'Instrument Serif, serif', fontSize: 20, color: 'var(--text)' }}>Gratis</span>
              </div>
            </div>
            {FEATURES.map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderTop: '1px solid var(--line-soft)', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text-soft)' }}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 7l3 3 6-6" stroke="#1F8A5B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {f}
              </div>
            ))}
            <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 7, background: 'rgba(42,111,219,.07)', border: '1px solid rgba(42,111,219,.15)', fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)' }}>
              El precio puede cambiar cuando salgamos de acceso anticipado.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[{ label: 'Meses', value: stats.months }, { label: 'Hábitos únicos', value: stats.habits }, { label: 'Días completados', value: stats.days }, { label: 'Cumplimiento', value: `${stats.pct}%` }].map(s => (
              <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 26, color: 'var(--text)', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'var(--text-muted)', marginTop: 5 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
            <button onClick={handleExport} style={{ width: '100%', padding: '14px 20px', border: 'none', borderBottom: '1px solid var(--line-soft)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text)', transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-alt)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M7.5 1.5v8M4.5 6.5l3 3 3-3M2.5 11v1.5a1 1 0 001 1h8a1 1 0 001-1V11"/></svg>
              Exportar mis datos
            </button>
            <button onClick={onLogout} style={{ width: '100%', padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#E05252', transition: 'background 120ms' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(224,82,82,.07)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 2H3.5a1 1 0 00-1 1v8a1 1 0 001 1H6M10 10.5l3-3-3-3M5 7.5h8"/></svg>
              Cerrar sesión
            </button>
          </div>

          <div style={{ background: 'rgba(224,82,82,.04)', border: '1px solid rgba(224,82,82,.15)', borderRadius: 14, padding: '16px 20px' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: '#E05252', marginBottom: 10, letterSpacing: '.06em', textTransform: 'uppercase' }}>Zona de peligro</div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(224,82,82,.3)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: '#E05252' }}>Eliminar cuenta y datos</button>
            ) : (
              <div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>Esta acción eliminará todos tus datos. ¿Continuar?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setConfirmDelete(false)} disabled={deleting} style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--text-muted)' }}>Cancelar</button>
                  <button onClick={handleDelete} disabled={deleting} style={{ flex: 1, padding: '8px', borderRadius: 7, border: 'none', background: '#E05252', cursor: deleting ? 'wait' : 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#fff' }}>
                    {deleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {toast && (
          <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--line)', padding: '10px 20px', borderRadius: 10, zIndex: 60, fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text)', boxShadow: '0 8px 24px rgba(0,0,0,.4)', animation: 'acOverlayIn 180ms ease' }}>{toast}</div>
        )}
      </div>
    </>
  )
}

// ── Loading screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', flexDirection: 'column', gap: 20 }}>
      <img src={logoUrl} alt="Osmin" style={{ height: 40, filter: 'brightness(0) invert(1) opacity(0.7)' }} />
      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text-muted)' }}>Cargando…</div>
    </div>
  )
}

// ── App ────────────────────────────────────────────────────────────────────────
const TWEAK_DEFAULTS: Tweaks = { theme: 'dark', density: 'compact', accent: '#2A6FDB' }

export default function App() {
  const { userId, getToken } = useAuth()
  const { user } = useUser()
  const { signOut } = useClerk()

  // Keep getToken reference stable so the Supabase client created once always has the latest token
  const getTokenRef = useRef(getToken)
  getTokenRef.current = getToken

  /**
   * Integración nativa Clerk → Supabase (Third-party Auth):
   * getToken() sin template devuelve el JWT de sesión de Clerk,
   * que Supabase verifica usando el JWKS de Clerk.
   * Si el proyecto tiene configurado un template 'supabase' en Clerk,
   * se usa ese primero (tiene el claim "role":"authenticated").
   */
  const getClerkToken = useMemo(() => async (): Promise<string | null> => {
    // Try the 'supabase' JWT template first (if configured in Clerk Dashboard).
    // It includes role:"authenticated" which matches Supabase RLS expectations.
    try {
      const t = await getTokenRef.current({ template: 'supabase' })
      if (t) return t
    } catch { /* template not configured, fall through */ }
    try {
      return await getTokenRef.current() ?? null
    } catch {
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const supabase = useMemo(() =>
    makeSupabaseClient(getClerkToken),
    [getClerkToken]
  )

  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState('')
  const [months, setMonths] = useState<Month[]>([])
  const [activeIdx, setActiveIdx] = useState(0)
  const [view, setView] = useState('month')
  const [layout, setLayout] = useState<LayoutType>('table')
  const [viewMode, setViewMode] = useState<'month' | 'overview'>('month')
  const [showAccount, setShowAccount] = useState(false)

  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS)
  const [showOnboarding, setShowOnboarding] = useState(false)


  // ── Sync user profile + log login event ──────────────────────────────────────
  useEffect(() => {
    if (!userId || !user) return
    const email = user.primaryEmailAddress?.emailAddress
      ?? user.emailAddresses?.[0]?.emailAddress
      ?? ''
    upsertUserProfile(supabase, userId, {
      email,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      imageUrl: user.imageUrl ?? '',
      clerkCreatedAt: user.createdAt ? new Date(user.createdAt) : null,
    })
    recordLoginEvent(supabase, userId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Initial fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    fetchAllData(supabase, userId).then(result => {
      if (result.months.length > 0) {
        // Sort months chronologically
        const sorted = [...result.months].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
        setMonths(sorted)
        if (result.tweaks) setTweak(result.tweaks)
        if (result.uiState) {
          const idx = sorted.findIndex(m => m.year === result.uiState!.year && m.month === result.uiState!.month)
          setActiveIdx(idx >= 0 ? idx : sorted.length - 1)
          setLayout(result.uiState.layout)
        } else {
          setActiveIdx(sorted.length - 1)
        }
      } else {
        const now = new Date()
        const blank = buildBlankMonth(now.getFullYear(), now.getMonth())
        setMonths([blank])
        saveMonthToDB(supabase, userId!, blank).catch(console.error)
        if (!localStorage.getItem('osmin_onboarding_v1')) {
          setShowOnboarding(true)
        }
      }
      setLoading(false)
    }).catch(err => {
      console.error('Failed to load data from Supabase', err)
      const msg = err instanceof Error ? err.message : String(err)
      setSaveError(`Error al cargar datos — ${msg}`)
      const now = new Date()
      setMonths([buildBlankMonth(now.getFullYear(), now.getMonth())])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // ── Theme / density / accent CSS vars ────────────────────────────────────────
  useEffect(() => {
    document.documentElement.dataset.theme = tweaks.theme
    document.documentElement.dataset.density = tweaks.density
    document.documentElement.style.setProperty('--accent', tweaks.accent)
  }, [tweaks.theme, tweaks.density, tweaks.accent])

  // ── Debounced Supabase saves ──────────────────────────────────────────────────
  const lastSavedMonths = useRef<Map<string, Month>>(new Map())

  useEffect(() => {
    if (loading || !userId || months.length === 0) return
    const timer = setTimeout(async () => {
      const prev = lastSavedMonths.current
      const toSave = months.filter(m => prev.get(`${m.year}-${m.month}`) !== m)
      for (const m of toSave) {
        try {
          await saveMonthToDB(supabase, userId, m)
          lastSavedMonths.current.set(`${m.year}-${m.month}`, m)
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err)
          console.error('[Osmin] save failed:', msg)
          setSaveError(msg)
          setTimeout(() => setSaveError(''), 6000)
        }
      }
    }, 1200)
    return () => clearTimeout(timer)
  }, [months, loading, userId, supabase])

  useEffect(() => {
    if (loading || !userId) return
    const timer = setTimeout(() => {
      saveTweaksToDB(supabase, userId, tweaks).catch(console.error)
    }, 1200)
    return () => clearTimeout(timer)
  }, [tweaks, loading, userId, supabase])

  useEffect(() => {
    if (loading || !userId || months.length === 0) return
    const m = months[activeIdx]
    if (!m) return
    const timer = setTimeout(() => {
      saveUiStateToDB(supabase, userId, m.year, m.month, layout).catch(console.error)
    }, 1200)
    return () => clearTimeout(timer)
  }, [activeIdx, layout, months, loading, userId, supabase])

  // ── Month helpers ─────────────────────────────────────────────────────────────
  const month = months[activeIdx] ?? months[0]

  const setMonth = (updater: Month | ((prev: Month) => Month)) => {
    setMonths(ms => {
      const next = ms.slice()
      next[activeIdx] = typeof updater === 'function' ? updater(ms[activeIdx]) : updater
      return next
    })
  }

  const addMonth = (year: number, monthIdx: number) => {
    const last = months[months.length - 1]
    const newIdx = months.length
    const newMonth = buildBlankMonth(year, monthIdx, last.habits)
    setMonths(ms => [...ms, newMonth])
    setActiveIdx(newIdx)
    setViewMode('month')
    if (userId) saveMonthToDB(supabase, userId, newMonth).catch(console.error)
  }

  const deleteMonth = (idx: number) => {
    if (months.length <= 1) return
    const m = months[idx]
    setMonths(ms => ms.filter((_, i) => i !== idx))
    setActiveIdx(ai => {
      if (idx < ai) return ai - 1
      if (idx === ai) return Math.max(0, idx - 1)
      return ai
    })
    lastSavedMonths.current.delete(`${m.year}-${m.month}`)
    if (userId) deleteMonthFromDB(supabase, userId, m.year, m.month).catch(console.error)
  }

  // ── Habit navigation helpers ──────────────────────────────────────────────────
  const goToHabits = () => {
    setViewMode('overview')
  }

  const goToEditHabits = () => {
    setViewMode('overview')
    setTimeout(() => {
      document.getElementById('habits-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }

  // ── TweaksPanel keyboard shortcut ────────────────────────────────────────────
  const openTweaks = () => window.postMessage({ type: '__activate_edit_mode' }, window.location.origin)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') { e.preventDefault(); openTweaks() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ── Account actions ───────────────────────────────────────────────────────────
  const handleLogout = () => signOut()

  const handleDeleteAccount = async () => {
    if (userId) await deleteAllUserData(supabase, userId).catch(console.error)
    await signOut()
  }

  if (loading || !month) return <LoadingScreen />

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', overflow: 'hidden', background: 'var(--bg-app)' }}>
      <Sidebar
        months={months} activeIdx={activeIdx}
        setActiveIdx={i => { setActiveIdx(i); setViewMode('month') }}
        addMonth={addMonth} deleteMonth={deleteMonth}
        view={view} setView={setView}
        onOpenAccount={() => setShowAccount(true)}
        onOpenTweaks={openTweaks}
        onViewHabits={goToHabits}
      />

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <MonthHeader
          month={month} layout={layout} setLayout={setLayout}
          onPrev={() => setActiveIdx(i => Math.max(0, i - 1))}
          onNext={() => setActiveIdx(i => Math.min(months.length - 1, i + 1))}
          viewMode={viewMode} setViewMode={setViewMode}
          onEditHabits={goToEditHabits}
        />

        {view === 'stats' && viewMode !== 'overview' && (
          <div style={{ display: 'flex', gap: 12, padding: '16px 28px 0', flexWrap: 'wrap' }}>
            {month.habits.map(h => <StatTile key={h.id} habit={h} month={month} />)}
          </div>
        )}

        {viewMode !== 'overview' && (
          <div style={{ padding: '12px 28px 0' }}>
            <MilestonesStrip month={month} />
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto', padding: viewMode !== 'overview' && layout === 'table' ? '0 28px 80px' : '20px 28px 80px' }}>
          {viewMode === 'overview' ? (
            <OverviewView month={month} setMonth={setMonth} />
          ) : layout === 'table' ? (
            <TableLayout month={month} setMonth={setMonth} density={tweaks.density} />
          ) : (
            <JournalLayout month={month} setMonth={setMonth} density={tweaks.density} />
          )}
        </div>
      </main>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Apariencia" />
        <TweakRadio label="Tema" value={tweaks.theme} onChange={v => setTweak('theme', v as Tweaks['theme'])} options={[{ value: 'light', label: 'Claro' }, { value: 'dark', label: 'Oscuro' }]} />
        <TweakRadio label="Densidad" value={tweaks.density} onChange={v => setTweak('density', v as Tweaks['density'])} options={[{ value: 'comfy', label: 'Cómoda' }, { value: 'compact', label: 'Compacta' }]} />
        <TweakColor label="Acento" value={tweaks.accent} onChange={v => setTweak('accent', v as string)} options={['#C97A2A', '#2A6FDB', '#1F8A5B', '#7C5CD0']} />
        <TweakSection label="Layout" />
        <TweakRadio label="Vista del mes" value={layout} onChange={v => setLayout(v as LayoutType)} options={[{ value: 'table', label: 'Tabla' }, { value: 'journal', label: 'Bitácora' }]} />
      </TweaksPanel>

      {saveError && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 100, background: '#E05252', color: '#fff', padding: '10px 20px', borderRadius: 10, fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, boxShadow: '0 8px 24px rgba(0,0,0,.4)', maxWidth: 420, textAlign: 'center' }}>
          Error al guardar en Supabase: {saveError}
        </div>
      )}

      {showAccount && (
        <AccountPanel
          months={months}
          onClose={() => setShowAccount(false)}
          onLogout={handleLogout}
          onDeleteAccount={handleDeleteAccount}
        />
      )}

      {showOnboarding && (
        <OnboardingFlow onComplete={() => {
          setShowOnboarding(false)
          localStorage.setItem('osmin_onboarding_v1', '1')
        }} />
      )}
    </div>
  )
}
