import { useState } from 'react'
import { useSignIn, useSignUp } from '@clerk/clerk-react'
import { AppleSignIn, isCanceled } from '../lib/appleSignIn'

/**
 * «Continuar con Apple» sin salir de la app.
 *
 * La hoja la pinta el sistema (ver AppleSignInPlugin.swift) y a la parte web
 * solo le llega el `identityToken`, que Clerk canjea con `oauth_token_apple`.
 * Nada de esto navega fuera del WebView, que es lo que rompía el OAuth por
 * redirección: iOS se lleva esa navegación a Safari y la sesión se queda allí.
 *
 * El 403 que daba antes no era que Clerk rechazase la estrategia desde el SDK
 * web: era que el token no llevaba `nonce`. Está arreglado en el plugin.
 */

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
      const { identityToken: token, givenName, familyName } = await AppleSignIn.authorize()

      // Se intenta SIEMPRE el alta primero, aunque la cuenta ya exista. Clerk
      // contesta entonces `transferable`, y la transferencia reutiliza esa misma
      // verificación para iniciar sesión. Lo que no se puede es reintentar con
      // el token: Apple solo lo acepta una vez y el segundo canje falla.
      const alta = await signUp.create({
        strategy: 'oauth_token_apple',
        token,
        // Apple solo manda el nombre la primera vez que se autoriza la app.
        firstName: givenName || undefined,
        lastName: familyName || undefined,
      })

      const sesion =
        alta.verifications.externalAccount.status === 'transferable'
          ? (await signIn.create({ transfer: true })).createdSessionId
          : alta.createdSessionId

      if (!sesion) throw new Error(`Clerk no creó sesión (alta: ${alta.status})`)

      await setActive({ session: sesion })
    } catch (err) {
      if (!isCanceled(err)) {
        console.error('[Osmin] falló el acceso con Apple:', err)
        setError(describe(err))
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

/**
 * Para saber si ha fallado Apple o Clerk. Sin esto el fallo es siempre el mismo
 * mensaje y no hay forma de distinguir «el sistema no ha dado token» de
 * «Clerk no reconoce esta app», que se arreglan en sitios muy distintos.
 */
const describe = (err: unknown): string => {
  const clerk = (err as { errors?: { code?: string; message?: string }[] })?.errors
  if (Array.isArray(clerk) && clerk.length) {
    return `clerk/${clerk[0].code ?? '?'}: ${clerk[0].message ?? ''}`
  }
  const native = err as { code?: string; message?: string }
  if (native?.code) return `apple/${native.code}: ${native.message ?? ''}`
  return String((err as Error)?.message ?? err)
}
