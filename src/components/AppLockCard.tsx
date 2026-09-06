import { useEffect, useState } from 'react'
import { comprobarBiometria, isLockEnabled, setLockEnabled, verificar } from '../lib/appLock'

/**
 * Ajuste del bloqueo biométrico, junto al del recordatorio. Solo se pinta en el
 * binario nativo: quien decide si se muestra es AccountPanel.
 */
export default function AppLockCard() {
  const [activo, setActivo] = useState(isLockEnabled)
  const [nombre, setNombre] = useState('Face ID')
  const [disponible, setDisponible] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void comprobarBiometria().then(b => { setDisponible(b.disponible); setNombre(b.nombre) })
  }, [])

  const cambiar = async () => {
    if (busy || !disponible) return
    setBusy(true)
    // Para encenderlo se pide la cara una vez: así nadie deja el bloqueo puesto
    // sin haber comprobado que funciona en su teléfono. Y para quitarlo también,
    // que si no bastaría con coger el móvil desbloqueado para desactivarlo.
    const ok = await verificar()
    if (ok) {
      setLockEnabled(!activo)
      setActivo(!activo)
    }
    setBusy(false)
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="var(--accent)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="2.6" y="6.6" width="9.8" height="6.8" rx="1.6" />
              <path d="M4.9 6.6V4.6a2.6 2.6 0 015.2 0v2" />
            </svg>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
              Bloquear con {nombre}
            </div>
          </div>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.45 }}>
            {disponible === false
              ? `Este dispositivo no tiene ${nombre} configurado.`
              : 'Tu diario queda cerrado al abrir la app y al volver de otra.'}
          </div>
        </div>

        <button
          role="switch"
          aria-checked={activo}
          aria-label={`Bloquear con ${nombre}`}
          disabled={busy || disponible !== true}
          onClick={() => void cambiar()}
          style={{
            flexShrink: 0,
            width: 44,
            height: 26,
            padding: 3,
            border: 'none',
            borderRadius: 13,
            cursor: busy ? 'wait' : disponible ? 'pointer' : 'default',
            opacity: disponible ? 1 : 0.4,
            background: activo ? 'var(--accent)' : 'var(--line-strong)',
            transition: 'background 160ms',
            display: 'flex',
            justifyContent: activo ? 'flex-end' : 'flex-start',
          }}
        >
          <span style={{ width: 20, height: 20, borderRadius: '50%', background: '#fff', transition: 'all 160ms' }} />
        </button>
      </div>
    </div>
  )
}
