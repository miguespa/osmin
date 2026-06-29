import { useState, useEffect, useRef } from 'react'

// ── Modal de selección de tipo texto-check ─────────────────────────────────────
// Aparece al activar el tipo "texto" por primera vez — explica la diferencia
// con el check normal antes de confirmar el cambio.

interface TextCheckExplainerProps {
  habitLabel: string
  onConfirm: () => void
  onCancel: () => void
}

export function TextCheckExplainer({ habitLabel, onConfirm, onCancel }: TextCheckExplainerProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '28px 28px 24px', maxWidth: 400, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'color-mix(in oklab, var(--accent) 15%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round">
              <rect x="3" y="3" width="14" height="14" rx="3" />
              <path d="M7 10l2.5 2.5L13 7" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>Check con texto</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)' }}>un tipo especial de hábito</div>
          </div>
        </div>

        {/* Comparativa */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <div style={{ background: 'var(--surface-alt)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--line)' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>✅  Check normal</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Marcas el día como completado (o no). Simple, rápido, todo o nada.
            </div>
            <div style={{ marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>
              Ejemplo: <span style={{ color: 'var(--text)' }}>¿Fui al gym?  ✓  /  ✗</span>
            </div>
          </div>
          <div style={{ background: 'color-mix(in oklab, var(--accent) 7%, var(--surface-alt))', borderRadius: 12, padding: '12px 14px', border: '1px solid color-mix(in oklab, var(--accent) 30%, var(--line))' }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>🔤  Check con texto  ←  estás aquí</div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13.5, color: 'var(--text)', lineHeight: 1.5 }}>
              Además de marcar el día, escribes <b>hasta 3 letras</b> para añadir contexto. Sigue contando como completado.
            </div>
            <div style={{ marginTop: 8, fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: 'var(--text-muted)' }}>
              Ejemplo: <span style={{ color: 'var(--text)' }}>¿Fui al gym?  <b style={{ color: 'var(--accent)' }}>PEC</b>  (pecho),  <b style={{ color: 'var(--accent)' }}>PIE</b>  (pierna)…</span>
            </div>
          </div>
        </div>

        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Activarás esto para <b style={{ color: 'var(--text)' }}>{habitLabel}</b>. Puedes volver a «Check» en cualquier momento desde la configuración de hábitos.
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'transparent',
            fontFamily: 'Inter, sans-serif', fontSize: 13.5, fontWeight: 500,
            color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            Mantener Check
          </button>
          <button onClick={onConfirm} style={{
            flex: 1, padding: '10px 16px', borderRadius: 10,
            border: 'none', background: 'var(--accent)',
            fontFamily: 'Inter, sans-serif', fontSize: 13.5, fontWeight: 600,
            color: '#fff', cursor: 'pointer',
          }}>
            Activar texto ✓
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de entrada de valor text-check ──────────────────────────────────────
// Reemplaza el prompt() nativo del navegador. Se usa desde Journal y tabla.

interface TextCheckInputProps {
  habitLabel: string
  currentValue: string
  color: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function TextCheckInput({ habitLabel, currentValue, color, onConfirm, onCancel }: TextCheckInputProps) {
  const [draft, setDraft] = useState(currentValue)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const commit = () => onConfirm(draft.trim().toUpperCase().slice(0, 3))
  const clear  = () => onConfirm('')

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 18, padding: '24px 24px 20px', maxWidth: 340, width: '100%',
        boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
      }}>
        {/* Título */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{habitLabel}</div>
        </div>

        {/* Instrucción */}
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.55 }}>
          Escribe <b style={{ color: 'var(--text)' }}>hasta 3 letras</b> para recordar el detalle de hoy — grupo muscular, tipo de actividad, etc.  Dejar en blanco marca el día como <i>no completado</i>.
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value.toUpperCase().slice(0, 3))}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') onCancel() }}
          placeholder="ej. PEC, PIE, HOM…"
          maxLength={3}
          style={{
            width: '100%', boxSizing: 'border-box',
            height: 52, borderRadius: 12,
            border: `2px solid ${color}`,
            padding: '0 16px',
            fontFamily: 'JetBrains Mono, monospace', fontSize: 16, fontWeight: 700,
            textAlign: 'center', background: 'var(--surface-alt)',
            color: 'var(--text)', outline: 'none', textTransform: 'uppercase',
            letterSpacing: '0.12em',
          } as React.CSSProperties}
        />

        {/* Contador */}
        <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono, monospace', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 6, marginBottom: 16 }}>
          {draft.length}/3
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          {currentValue && (
            <button onClick={clear} style={{
              padding: '9px 14px', borderRadius: 10,
              border: '1px solid var(--line)', background: 'transparent',
              fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
            }}>
              Quitar ✗
            </button>
          )}
          <button onClick={onCancel} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10,
            border: '1px solid var(--line)', background: 'transparent',
            fontFamily: 'Inter, sans-serif', fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer',
          }}>
            Cancelar
          </button>
          <button onClick={commit} style={{
            flex: 1, padding: '9px 14px', borderRadius: 10,
            border: 'none', background: color,
            fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
            color: '#fff', cursor: 'pointer', opacity: draft.length === 0 ? 0.5 : 1,
          }}>
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
