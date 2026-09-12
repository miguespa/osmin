import { useSignIn, useSignUp } from '@clerk/clerk-react'

/**
 * El canje de un identity token nativo por una sesión de Clerk, que Apple y
 * Google hacen exactamente igual.
 *
 * El orden importa y no es el intuitivo:
 *
 * 1. **Se intenta ENTRAR primero.** Si la cuenta existe, entra y ya está. Si no
 *    existe, Clerk no da error: devuelve la verificación en estado
 *    `transferable`, y con eso el alta se completa sin volver a canjear nada.
 * 2. **El token no se puede reutilizar.** Ni Apple ni Google aceptan un segundo
 *    canje del mismo identity token: llevan anti-replay. De ahí que exista la
 *    transferencia, en vez de «pruebo a entrar y, si no existe, registro».
 *
 * Se probó al revés —alta primero y transferir si ya existía— y está mal: con
 * una cuenta que ya existe, `signUp.create` no responde `transferable`, lanza
 * `external_account_exists`. Funcionaba al registrarse y dejaba fuera a
 * cualquiera que volviera a entrar. Pasó en el build 8, con Google y con Apple.
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
  const entrada = await signIn.create({ strategy, token })

  // Cuenta nueva: no es un fallo, es que esta verificación puede convertirse en
  // un alta. El token ya está gastado, así que `transfer` es la única vía.
  const sesion =
    entrada.firstFactorVerification.status === 'transferable'
      ? (await signUp.create({ transfer: true, firstName, lastName })).createdSessionId
      : entrada.createdSessionId

  if (!sesion) {
    throw new Error(
      `Clerk no creó sesión (entrada: ${entrada.status}, verificación: ${entrada.firstFactorVerification.status})`,
    )
  }
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
