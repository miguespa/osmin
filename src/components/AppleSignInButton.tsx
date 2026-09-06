import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { AppleSignIn, isCanceled } from '../lib/appleSignIn'

/**
 * El botón de Apple que trae `<SignIn>` hace el OAuth por redirección, y esa
 * navegación se le escapa al WebView: iOS la abre en Safari y la sesión se
 * queda allí. Por eso en el binario nativo se oculta el suyo y se pinta este,
 * que pide la autorización al sistema y canjea el token con Clerk sin salir
 * de la app.
 */

/** Clerk responde esto cuando el Apple ID todavía no tiene cuenta en Osmin. */
const NOT_REGISTERED = new Set(['external_account_not_found', 'form_identifier_not_found'])

const isNotRegistered = (err: unknown) => {
  const errors = (err as { errors?: { code?: string }[] })?.errors
  return Array.isArray(errors) && errors.some(e => e.code && NOT_REGISTERED.has(e.code))
}

export default function AppleSignInButton() {
  const { signIn, setActive, isLoaded: signInReady } = useSignIn()
  const { signUp, isLoaded: signUpReady } = useSignUp()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ready = signInReady && signUpReady && !busy

  const handleClick = async () => {
    if (!ready || !signIn || !signUp || !setActive) return
    setBusy(true)
    setError(null)

    try {
      const { identityToken: token } = await AppleSignIn.authorize()

      // Clerk no expone un «entra o regístrate» para esta estrategia, así que
      // se prueba a entrar y solo si la cuenta no existe se crea.
      let sessionId: string | null = null
      try {
        const attempt = await signIn.create({ strategy: 'oauth_token_apple', token })
        if (attempt.status !== 'complete') throw new Error(`estado ${attempt.status}`)
        sessionId = attempt.createdSessionId
      } catch (err) {
        if (!isNotRegistered(err)) throw err
        const attempt = await signUp.create({ strategy: 'oauth_token_apple', token })
        if (attempt.status !== 'complete') throw new Error(`estado ${attempt.status}`)
        sessionId = attempt.createdSessionId
      }

      await setActive({ session: sessionId })
    } catch (err) {
      if (!isCanceled(err)) {
        console.error('[Osmin] falló el acceso con Apple:', err)
        setError('No se ha podido entrar con Apple. Inténtalo de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Apple exige su marca en negro sobre blanco o blanco sobre negro, sin
          alterar el logo ni el texto más allá del idioma. */}
      <button
        type="button"
        onClick={handleClick}
        disabled={!ready}
        style={{
          width: '100%',
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          border: 'none',
          borderRadius: 8,
          background: '#000',
          color: '#fff',
          fontSize: 17,
          fontWeight: 500,
          fontFamily: '-apple-system, "Inter", sans-serif',
          cursor: ready ? 'pointer' : 'default',
          opacity: ready ? 1 : 0.5,
        }}
      >
        <svg width="17" height="20" viewBox="0 0 17 20" fill="#fff" aria-hidden="true">
          <path d="M14.02 10.62c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.61-1.7-3.18-1.73-1.36-.14-2.65.8-3.34.8-.68 0-1.75-.78-2.87-.76-1.48.02-2.84.86-3.6 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.25 2.74 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.7.71 2.87.69 1.18-.02 1.93-1.08 2.65-2.14.83-1.22 1.18-2.41 1.2-2.47-.03-.01-2.3-.88-2.3-3.51zM11.83 3.9c.6-.74 1.01-1.75.9-2.76-.87.04-1.93.58-2.56 1.31-.56.65-1.05 1.69-.92 2.68.97.08 1.96-.49 2.58-1.23z" />
        </svg>
        {busy ? 'Conectando…' : 'Continuar con Apple'}
      </button>

      {error && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#C0392B', textAlign: 'center' }}>
          {error}
        </p>
      )}
    </div>
  )
}
