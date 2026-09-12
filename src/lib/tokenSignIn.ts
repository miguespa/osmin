import { useSignIn, useSignUp } from '@clerk/clerk-react'

/**
 * El canje de un identity token nativo por una sesión de Clerk, que Apple y
 * Google hacen exactamente igual.
 *
 * Vive aparte porque tiene dos trampas que no se ven leyendo el código y que
 * conviene arreglar en un solo sitio:
 *
 * 1. **Siempre se intenta el alta primero**, aunque la cuenta ya exista. Clerk
 *    responde entonces `transferable`, y la transferencia reutiliza esa misma
 *    verificación para iniciar sesión.
 * 2. **El token no se puede reutilizar.** Ni Apple ni Google aceptan un segundo
 *    canje del mismo identity token: llevan anti-replay. Por eso no vale el
 *    patrón intuitivo de «pruebo a entrar y, si no existe, registro».
 */

// Los tipos salen de los propios hooks para no depender de la ruta interna
// donde Clerk publica sus tipos, que ha cambiado entre versiones.
type RecursoSignIn = NonNullable<ReturnType<typeof useSignIn>['signIn']>
type RecursoSignUp = NonNullable<ReturnType<typeof useSignUp>['signUp']>

/** Las estrategias de canje de token nativo que admite este SDK de Clerk. */
type EstrategiaToken = 'oauth_token_apple' | 'google_one_tap'

interface Opciones {
  signIn: RecursoSignIn
  signUp: RecursoSignUp
  strategy: EstrategiaToken
  token: string
  /** Apple solo los manda la primera vez; Google los saca del propio token. */
  firstName?: string
  lastName?: string
}

/** Devuelve el id de la sesión creada, listo para `setActive`. */
export async function canjearToken({
  signIn, signUp, strategy, token, firstName, lastName,
}: Opciones): Promise<string> {
  const alta = await signUp.create({ strategy, token, firstName, lastName })

  const sesion =
    alta.verifications.externalAccount.status === 'transferable'
      ? (await signIn.create({ transfer: true })).createdSessionId
      : alta.createdSessionId

  if (!sesion) throw new Error(`Clerk no creó sesión (alta: ${alta.status})`)
  return sesion
}

/**
 * Para saber si ha fallado el proveedor o Clerk. Sin esto el fallo es siempre
 * el mismo mensaje y no hay forma de distinguir «el sistema no ha dado token»
 * de «Clerk no reconoce esta app», que se arreglan en sitios muy distintos.
 */
export const describirError = (err: unknown): string => {
  const clerk = (err as { errors?: { code?: string; message?: string }[] })?.errors
  if (Array.isArray(clerk) && clerk.length) {
    return `clerk/${clerk[0].code ?? '?'}: ${clerk[0].message ?? ''}`
  }
  const nativo = err as { code?: string; message?: string }
  if (nativo?.code) return `nativo/${nativo.code}: ${nativo.message ?? ''}`
  return String((err as Error)?.message ?? err)
}
