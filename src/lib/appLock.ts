import { Capacitor } from '@capacitor/core'
// Estático a propósito, por lo mismo que en reminder.ts: dentro del WebView un
// `await import(...)` se queda pendiente para siempre.
import { NativeBiometric, BiometryType } from '@capgo/capacitor-native-biometric'

/**
 * Bloqueo biométrico de la app.
 *
 * No sustituye al acceso: la sesión de Clerk sigue siendo la que abre la puerta
 * contra el servidor. Esto es una cerradura local delante de una sesión ya
 * abierta —el patrón de las apps de banco—, porque el «sí» del sensor solo lo
 * conoce el teléfono y no demuestra nada fuera de él.
 */

const KEY = 'osmin_lock'

/**
 * Al cambiar de app un momento no debe pedir la cara otra vez; a los dos
 * minutos fuera, sí. Es el equilibrio habitual entre estorbar y proteger.
 */
const GRACIA_MS = 120_000

export const supportsLock = () => Capacitor.isNativePlatform()

export function isLockEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

export function setLockEnabled(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch { /* almacenamiento no disponible */ }
}

export interface Biometria {
  disponible: boolean
  /** Cómo llamarlo en pantalla: cada teléfono tiene lo suyo. */
  nombre: string
}

const NOMBRES: Partial<Record<BiometryType, string>> = {
  [BiometryType.FACE_ID]: 'Face ID',
  [BiometryType.TOUCH_ID]: 'Touch ID',
  [BiometryType.FINGERPRINT]: 'la huella',
  [BiometryType.FACE_AUTHENTICATION]: 'el reconocimiento facial',
  [BiometryType.IRIS_AUTHENTICATION]: 'el iris',
}

export async function comprobarBiometria(): Promise<Biometria> {
  if (!supportsLock()) return { disponible: false, nombre: 'Face ID' }
  try {
    const r = await NativeBiometric.isAvailable({ useFallback: false })
    return { disponible: r.isAvailable, nombre: NOMBRES[r.biometryType] ?? 'la biometría' }
  } catch {
    return { disponible: false, nombre: 'Face ID' }
  }
}

/** Resuelve si el usuario se identifica; false si cancela o no lo consigue. */
export async function verificar(): Promise<boolean> {
  try {
    await NativeBiometric.verifyIdentity({
      reason: 'Para abrir tu diario',
      title: 'Osmin',
      subtitle: '',
      description: '',
    })
    return true
  } catch {
    return false
  }
}

/**
 * Avisa cuando toca volver a pedir identidad: al arrancar, y al volver de
 * segundo plano si se ha estado fuera más de la gracia. Devuelve la función
 * para dejar de escuchar.
 *
 * Se usa `visibilitychange` en vez del plugin de estado de la app porque el
 * WebView oculta el documento igual al irse al fondo, y así no hay una
 * dependencia más que mantener.
 */
export function vigilarSegundoPlano(alVolver: () => void): () => void {
  let ocultaDesde = 0

  const onChange = () => {
    if (document.visibilityState === 'hidden') {
      ocultaDesde = Date.now()
      return
    }
    if (ocultaDesde && Date.now() - ocultaDesde > GRACIA_MS) alVolver()
    ocultaDesde = 0
  }

  document.addEventListener('visibilitychange', onChange)
  return () => document.removeEventListener('visibilitychange', onChange)
}
