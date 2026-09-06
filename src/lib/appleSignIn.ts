import { registerPlugin } from '@capacitor/core'

/** Lo que devuelve `AppleSignInPlugin.swift`. */
export interface AppleAuthorization {
  identityToken: string
  /** Identificador estable del usuario para esta app. Apple sí lo manda siempre. */
  user: string
  /** Vacíos salvo la primera vez que este Apple ID autoriza la app. */
  email: string
  givenName: string
  familyName: string
}

interface AppleSignInPlugin {
  authorize(): Promise<AppleAuthorization>
}

export const AppleSignIn = registerPlugin<AppleSignInPlugin>('AppleSignIn')

/** El usuario cerró la hoja del sistema: es una salida normal, no un error que mostrar. */
export const isCanceled = (err: unknown) =>
  typeof err === 'object' && err !== null && (err as { code?: string }).code === 'canceled'
