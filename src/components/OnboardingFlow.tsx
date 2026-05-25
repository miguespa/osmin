import { useState } from 'react'

interface Props {
  onComplete: () => void
}

// ── Mockup helpers ─────────────────────────────────────────────────────────────
function MockHabitChip({ label, checked, color }: { label: string; checked: boolean; color: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 9px',
      borderRadius: 99, border: `1.5px solid ${checked ? color : 'rgba(255,255,255,.15)'}`,
      background: checked ? `${color}22` : 'transparent',
      fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
      color: checked ? color : 'rgba(255,255,255,.45)', userSelect: 'none',
    }}>
      {checked && <span style={{ fontSize: 9, opacity: .9 }}>✓</span>}
      {label}
    </span>
  )
}

function MockDayRow({ day, highlight, habits, pulse }: { day: number; highlight: string; habits: { label: string; color: string; done: boolean }[]; pulse?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
      <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,.4)', width: 18, textAlign: 'right', flexShrink: 0 }}>{day}</span>
      <div style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 11, color: highlight ? 'rgba(255,255,255,.75)' : 'rgba(255,255,255,.2)', fontStyle: highlight ? 'normal' : 'italic' }}>
        {highlight || 'Añade una nota del día…'}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {habits.map((h, i) => (
          <MockHabitChip key={i} label={h.label} checked={h.done} color={h.color} />
        ))}
      </div>
      {pulse && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#2A6FDB', flexShrink: 0, animation: 'ob-pulse 1.2s ease infinite' }} />
      )}
    </div>
  )
}

// ── Step definitions ───────────────────────────────────────────────────────────
const ACCENT = '#2A6FDB'
const GREEN  = '#1F8A5B'
const AMBER  = '#C97A2A'
const PURPLE = '#7C5CD0'

function StepWelcome() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>🗓</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'rgba(255,255,255,.92)', lineHeight: 1.15, marginBottom: 14 }}>
        Tu primera página<br />en blanco
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.65, maxWidth: 340, margin: '0 auto' }}>
        Osmin te ayuda a registrar cada día: tus logros, tus hábitos y tus metas del mes.
        Te mostramos cómo en cuatro pasos rápidos.
      </div>
    </div>
  )
}

function StepDiary() {
  const [typed, setTyped] = useState(false)
  return (
    <div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 14, lineHeight: 1.6 }}>
        Cada día tiene un campo de <strong style={{ color: 'rgba(255,255,255,.8)' }}>highlight</strong>.
        Haz clic en la celda y escribe lo más destacado de tu jornada.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <MockDayRow
          day={1}
          highlight="Cena con Nerea. Reunión mensual."
          habits={[{ label: 'Gym', color: ACCENT, done: true }, { label: 'Leer', color: GREEN, done: false }]}
        />
        <div
          onClick={() => setTyped(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 8,
            background: typed ? 'rgba(42,111,219,.08)' : 'rgba(255,255,255,.04)',
            border: `1.5px solid ${typed ? ACCENT : 'rgba(255,255,255,.1)'}`,
            cursor: 'pointer', transition: 'all 200ms' }}
        >
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,.4)', width: 18, textAlign: 'right' }}>2</span>
          <div style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 11, color: typed ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.25)', fontStyle: typed ? 'normal' : 'italic' }}>
            {typed ? '← Toca aquí para editar el highlight del día ✓' : 'Toca aquí para añadir tu nota del día…'}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            <MockHabitChip label="Gym" checked={false} color={ACCENT} />
            <MockHabitChip label="Leer" checked={false} color={GREEN} />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 12, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'rgba(255,255,255,.35)', textAlign: 'center' }}>
        {typed ? '✓ Perfecto — así de sencillo.' : 'Prueba a tocar la fila de arriba'}
      </div>
    </div>
  )
}

function StepHabits() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const toggle = (k: string) => setChecked(c => ({ ...c, [k]: !c[k] }))
  const habits = [
    { id: 'gym',  label: 'Gym',  color: ACCENT  },
    { id: 'read', label: 'Leer', color: GREEN   },
    { id: 'med',  label: 'Med',  color: PURPLE  },
  ]
  const done = Object.values(checked).filter(Boolean).length
  return (
    <div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 14, lineHeight: 1.6 }}>
        Los chips de colores marcan tus hábitos del día. <strong style={{ color: 'rgba(255,255,255,.8)' }}>Toca uno</strong> para marcarle como completado.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {[1, 2, 3].map((day, i) => (
          <div key={day} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'rgba(255,255,255,.4)', width: 18, textAlign: 'right' }}>{day}</span>
            <div style={{ flex: 1, fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,.3)', fontStyle: 'italic' }}>—</div>
            <div style={{ display: 'flex', gap: 5 }}>
              {habits.map(h => {
                const k = `${day}-${h.id}`
                const c = !!checked[k]
                return (
                  <span key={h.id} onClick={() => toggle(k)} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
                    borderRadius: 99, border: `1.5px solid ${c ? h.color : 'rgba(255,255,255,.15)'}`,
                    background: c ? `${h.color}22` : 'transparent',
                    fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600,
                    color: c ? h.color : 'rgba(255,255,255,.4)', cursor: 'pointer',
                    userSelect: 'none', transition: 'all 150ms',
                    boxShadow: i === 0 && !c ? `0 0 0 2px ${h.color}44` : 'none',
                  }}>
                    {c && <span style={{ fontSize: 9 }}>✓</span>}
                    {h.label}
                  </span>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'rgba(255,255,255,.35)', textAlign: 'center' }}>
        {done === 0 ? 'Toca los chips para marcar hábitos completados' : `${done} completado${done > 1 ? 's' : ''} — ¡bien hecho!`}
      </div>
    </div>
  )
}

function StepManage() {
  return (
    <div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'rgba(255,255,255,.5)', marginBottom: 14, lineHeight: 1.6 }}>
        Desde la vista <strong style={{ color: 'rgba(255,255,255,.8)' }}>Destacados</strong> puedes añadir y quitar hábitos, retos mensuales y metas.
      </div>

      {/* Sidebar nav mockup */}
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ width: 130, flexShrink: 0, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 10, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {['Mes actual', 'Estadísticas', 'Destacados'].map((label, i) => (
            <div key={label} style={{ padding: '5px 8px', borderRadius: 6, background: i === 2 ? 'rgba(42,111,219,.18)' : 'transparent', fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: i === 2 ? 600 : 500, color: i === 2 ? 'rgba(255,255,255,.88)' : 'rgba(255,255,255,.35)' }}>
              {label}
            </div>
          ))}
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          {/* Habits section */}
          <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '9px 10px' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>Hábitos</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              <MockHabitChip label="Gym" checked color={ACCENT} />
              <MockHabitChip label="Leer" checked color={GREEN} />
              <MockHabitChip label="Med" checked color={PURPLE} />
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: 99, border: '1.5px dashed rgba(255,255,255,.2)', fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,.3)', cursor: 'pointer', gap: 4 }}>
                <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Añadir
              </span>
            </div>
          </div>

          {/* Goals section */}
          <div style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 9, padding: '9px 10px' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,.35)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 7 }}>Metas del mes</div>
            {[{ text: 'Ir al gym 3 veces por semana', done: true, color: ACCENT }, { text: 'Leer 10 páginas al día', done: false, color: GREEN }].map((g, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: i === 0 ? 5 : 0 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, border: `1.5px solid ${g.done ? g.color : 'rgba(255,255,255,.2)'}`, background: g.done ? `${g.color}22` : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {g.done && <span style={{ fontSize: 9, color: g.color }}>✓</span>}
                </span>
                <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: g.done ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.45)', textDecoration: g.done ? 'line-through' : 'none' }}>{g.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function StepDone() {
  return (
    <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
      <div style={{ fontSize: 52, marginBottom: 12, lineHeight: 1 }}>✅</div>
      <div style={{ fontFamily: 'Instrument Serif, serif', fontSize: 28, color: 'rgba(255,255,255,.92)', lineHeight: 1.15, marginBottom: 14 }}>
        Todo listo
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, color: 'rgba(255,255,255,.5)', lineHeight: 1.65, maxWidth: 340, margin: '0 auto' }}>
        Ya conoces lo esencial. Empieza registrando el día de hoy y construye tu historial paso a paso.
      </div>
      <div style={{ marginTop: 18, display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
        {['Constancia', 'Reflexión', 'Progreso'].map(tag => (
          <span key={tag} style={{ padding: '4px 12px', borderRadius: 99, border: '1px solid rgba(255,255,255,.12)', fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'rgba(255,255,255,.45)' }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

const STEPS = [
  { id: 'welcome', title: '',           component: StepWelcome },
  { id: 'diary',   title: 'Diario',     component: StepDiary   },
  { id: 'habits',  title: 'Hábitos',    component: StepHabits  },
  { id: 'manage',  title: 'Gestionar',  component: StepManage  },
  { id: 'done',    title: '',           component: StepDone    },
]

// ── OnboardingFlow ─────────────────────────────────────────────────────────────
export function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0)

  const StepComp = STEPS[step].component
  const isLast   = step === STEPS.length - 1
  const isFirst  = step === 0

  return (
    <>
      <style>{`
        @keyframes ob-in {
          from { opacity: 0; transform: scale(.95) translateY(12px) }
          to   { opacity: 1; transform: scale(1)  translateY(0) }
        }
        @keyframes ob-pulse {
          0%, 100% { opacity: 1 }
          50%       { opacity: .3 }
        }
      `}</style>

      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.72)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        {/* Card */}
        <div style={{ width: '100%', maxWidth: 480, background: '#171717', border: '1px solid rgba(255,255,255,.1)', borderRadius: 18, padding: '32px 32px 24px', boxShadow: '0 32px 80px rgba(0,0,0,.7)', animation: 'ob-in 260ms cubic-bezier(.22,1,.36,1)', display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Step title */}
          {STEPS[step].title && (
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: ACCENT }}>
              {STEPS[step].title}
            </div>
          )}

          {/* Step content */}
          <div>
            <StepComp />
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6 }}>
            {STEPS.map((_, i) => (
              <div key={i} style={{ width: i === step ? 18 : 6, height: 6, borderRadius: 99, background: i === step ? ACCENT : 'rgba(255,255,255,.15)', transition: 'all 220ms' }} />
            ))}
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 8 }}>
            {!isFirst && (
              <button onClick={() => setStep(s => s - 1)} style={{ flex: '0 0 auto', padding: '0 16px', height: 38, borderRadius: 9, border: '1px solid rgba(255,255,255,.12)', background: 'transparent', cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,.5)', transition: 'all 150ms' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(255,255,255,.8)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,.5)'}
              >Atrás</button>
            )}
            <button onClick={isLast ? onComplete : () => setStep(s => s + 1)} style={{ flex: 1, height: 38, borderRadius: 9, border: 'none', background: ACCENT, cursor: 'pointer', fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600, color: '#fff', transition: 'opacity 150ms' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '.85'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              {isLast ? 'Empezar a registrar' : step === 0 ? 'Ver cómo funciona' : 'Siguiente'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
