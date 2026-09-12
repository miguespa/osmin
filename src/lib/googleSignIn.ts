import { GoogleSignIn } from '@capawesome/capacitor-google-sign-in'

/**
 * Puente a «Sign in with Google» por SDK nativo.
 *
 * Existe porque el OAuth web de Google NO se puede hacer desde el WebView: la
 * propia documentación de Google lo prohíbe, y por eso el botón de Google que
 * pinta Clerk está oculto en nativo. Con el SDK del sistema la hoja la dibuja
 * iOS, y a la parte web solo le llega el `idToken`, que Clerk canjea con la
 * estrategia `google_one_tap`.
 *
 * **El cliente que se pasa aquí es el de tipo WEB, no el de iOS.** Es el que
 * acaba en el `aud` del token, y es contra el que valida Clerk, que tiene
 * configurado ese mismo cliente en su conexión de Google. El cliente de iOS va
 * en `GIDClientID` dentro del Info.plist y lo usa el SDK por su cuenta.
 * Cruzarlos es el fallo clásico de esta integración y da un token que Clerk
 * rechaza sin explicar por qué.
 */
const CLIENTE_WEB = '446757266637-veo1uahve8ss92m34b0ie8b3kqaqq7n4.apps.googleusercontent.com'

// `initialize` es idempotente pero no gratis, así que se hace una sola vez y se
// comparte la promesa: dos pulsaciones seguidas no deben inicializar dos veces.
let arranque: Promise<void> | null = null

export function iniciarGoogle(): Promise<void> {
  arranque ??= GoogleSignIn.initialize({ clientId: CLIENTE_WEB })
  return arranque
}

export async function autorizarConGoogle(): Promise<{ idToken: string }> {
  await iniciarGoogle()
  const { idToken } = await GoogleSignIn.signIn()
  if (!idToken) throw new Error('Google no devolvió un idToken')
  return { idToken }
}

/**
 * El usuario cerró la hoja del sistema: es una salida normal, no un error que
 * mostrar. El plugin no expone un código estable para esto, así que se mira el
 * texto, que en iOS viene del SDK de Google.
 */
export const canceladoPorElUsuario = (err: unknown) => {
  const mensaje = String((err as Error)?.message ?? err).toLowerCase()
  return mensaje.includes('cancel') || mensaje.includes('the user canceled')
}
