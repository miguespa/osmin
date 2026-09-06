import { useCallback, useEffect, useState } from 'react'
import { verificar } from '../lib/appLock'
import logoDark from '/logo-dark.png'

/**
 * Cerradura delante de la app. Se pinta encima de todo y no se quita hasta que
 * el sistema confirma la identidad.
 *
 * Lleva salida de emergencia a propósito: si alguien activa el bloqueo y luego
 * quita el Face ID de su teléfono, sin ella se quedaría fuera de sus propios
 * datos sin manera de entrar. Cerrar sesión no los borra —están en el servidor—
 * y permite volver por el correo.
 */
export default function LockScreen({ onUnlock, onSignOut }: {
  onUnlock: () => void
  onSignOut: () => void
}) {
  const [intentando, setIntentando] = useState(true)
  const [fallido, setFallido] = useState(false)

  const pedir = useCallback(async () => {
    setIntentando(true)
    setFallido(false)
    const ok = await verificar()
    setIntentando(false)
    if (ok) onUnlock()
    else setFallido(true)
  }, [onUnlock])

  // Al aparecer se pide sola: obligar a pulsar un botón antes de la cara sería
  // un paso de más en algo que se hace varias veces al día.
  useEffect(() => { void pedir() }, [pedir])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 300,
        background: '#16161A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        padding: 'max(32px, env(safe-area-inset-top)) 24px max(32px, env(safe-area-inset-bottom))',
      }}
    >
      <img src={logoDark} alt="Osmin" style={{ height: 34, width: 'auto', opacity: 0.9 }} />

      <p style={{ margin: 0, fontFamily: "'Inter', sans-serif", fontSize: 13, color: '#82807A', textAlign: 'center', lineHeight: 1.5 }}>
        {intentando ? 'Comprobando que eres tú…' : fallido ? 'No se ha podido comprobar tu identidad.' : 'Tu diario está bloqueado.'}
      </p>

      {!intentando && (
        <button
          onClick={() => void pedir()}
          style={{
            minWidth: 200,
            height: 42,
            border: 'none',
            borderRadius: 9,
            background: 'var(--accent, #C97A2A)',
            color: '#fff',
            fontFamily: "'Inter', sans-serif",
            fontSize: 13.5,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Desbloquear
        </button>
      )}

      {fallido && (
        <button
          onClick={onSignOut}
          style={{
            border: 'none',
            background: 'transparent',
            color: '#82807A',
            fontFamily: "'Inter', sans-serif",
            fontSize: 12,
            textDecoration: 'underline',
            cursor: 'pointer',
          }}
        >
          Cerrar sesión y entrar con el correo
        </button>
      )}
    </div>
  )
}
