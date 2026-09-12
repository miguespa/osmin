import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { autorizarConGoogle, canceladoPorElUsuario } from '../lib/googleSignIn'
import { canjearToken, describirError } from '../lib/tokenSignIn'

/**
 * «Continuar con Google» sin salir de la app.
 *
 * Google prohíbe expresamente hacer su OAuth dentro de un WebView, así que el
 * botón que pinta Clerk sigue oculto en nativo. Este usa el SDK del sistema:
 * la hoja la dibuja iOS y solo vuelve un `idToken`, que Clerk canjea.
 */
export default function GoogleSignInButton() {
  const { signIn, setActive, isLoaded: signInReady } = useSignIn()
  const { signUp, isLoaded: signUpReady } = useSignUp()
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const listo = signInReady && signUpReady && !ocupado

  const alPulsar = async () => {
    if (!listo || !signIn || !signUp || !setActive) return
    setOcupado(true)
    setError(null)

    try {
      const { idToken } = await autorizarConGoogle()
      const sesion = await canjearToken({
        signIn, signUp, strategy: 'google_one_tap', token: idToken,
      })
      await setActive({ session: sesion })
    } catch (err) {
      if (!canceladoPorElUsuario(err)) {
        console.error('[Osmin] falló el acceso con Google:', err)
        setError(describirError(err))
      }
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Google exige su logo sin recolorear y el botón en blanco o en negro.
          Se usa el blanco, que es el que contrasta con el de Apple encima. */}
      <button
        type="button"
        onClick={alPulsar}
        disabled={!listo}
        style={{
          width: '100%',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          border: '1px solid #747775',
          borderRadius: 8,
          background: '#fff',
          color: '#1F1F1F',
          fontSize: 16,
          fontWeight: 500,
          fontFamily: '-apple-system, "Inter", sans-serif',
          cursor: listo ? 'pointer' : 'default',
          opacity: listo ? 1 : 0.5,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#EA4335" d="M9 3.48c1.69 0 2.83.73 3.48 1.34l2.54-2.48C13.46.89 11.43 0 9 0 5.48 0 2.44 2.02.96 4.96l2.91 2.26C4.6 5.05 6.62 3.48 9 3.48z" />
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84c-.21 1.12-.84 2.07-1.79 2.71l2.82 2.19c1.65-1.52 2.77-3.76 2.77-6.54z" />
          <path fill="#FBBC05" d="M3.88 10.78a5.54 5.54 0 010-3.53L.96 4.96A9 9 0 000 9c0 1.45.35 2.82.96 4.04l2.92-2.26z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.82-2.19c-.76.53-1.78.9-3.14.9-2.38 0-4.4-1.57-5.13-3.75L.96 13.04C2.44 15.98 5.48 18 9 18z" />
        </svg>
        {ocupado ? 'Conectando…' : 'Continuar con Google'}
      </button>

      {error && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#C0392B', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
