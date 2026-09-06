import { Capacitor } from '@capacitor/core'

/**
 * Recordatorio diario. Es una notificación local: la programa el propio
 * teléfono y se dispara aunque no haya red ni servidor detrás, así que no
 * necesita push ni las credenciales de APNs.
 *
 * La preferencia vive en localStorage y no en Supabase a propósito: el permiso
 * lo concede cada dispositivo por separado, y sincronizar la hora entre ellos
 * dejaría avisos programados en teléfonos donde el usuario nunca aceptó.
 */

const KEY = 'osmin_reminder'

/** Fijo: al reprogramar hay que pisar el aviso anterior, no acumularlos. */
const ID = 1

export interface Reminder {
  enabled: boolean
  /** «HH:MM» en hora local del dispositivo. */
  time: string
}

export const DEFAULT_REMINDER: Reminder = { enabled: false, time: '21:00' }

/** Solo hay recordatorio en el binario nativo; en la web el panel ni se pinta. */
export const supportsReminders = () => Capacitor.isNativePlatform()

export function readReminder(): Reminder {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_REMINDER
    const parsed = JSON.parse(raw) as Partial<Reminder>
    if (typeof parsed.time !== 'string' || !/^\d{2}:\d{2}$/.test(parsed.time)) return DEFAULT_REMINDER
    return { enabled: parsed.enabled === true, time: parsed.time }
  } catch {
    return DEFAULT_REMINDER
  }
}

const writeReminder = (r: Reminder) => {
  try { localStorage.setItem(KEY, JSON.stringify(r)) } catch { /* almacenamiento no disponible */ }
}

const plugin = async () => (await import('@capacitor/local-notifications')).LocalNotifications

/**
 * Deja el aviso del teléfono igual que la preferencia recibida y la guarda.
 * Devuelve lo que ha quedado: si el usuario deniega el permiso vuelve apagado,
 * para que la interfaz no prometa un aviso que no va a llegar.
 */
export async function applyReminder(next: Reminder): Promise<Reminder> {
  if (!supportsReminders()) return next

  const LocalNotifications = await plugin()
  await LocalNotifications.cancel({ notifications: [{ id: ID }] })

  if (!next.enabled) {
    writeReminder(next)
    return next
  }

  let { display } = await LocalNotifications.checkPermissions()
  if (display !== 'granted') ({ display } = await LocalNotifications.requestPermissions())
  if (display !== 'granted') {
    const denied = { ...next, enabled: false }
    writeReminder(denied)
    return denied
  }

  const [hour, minute] = next.time.split(':').map(Number)
  await LocalNotifications.schedule({
    notifications: [{
      id: ID,
      title: 'Tu día en Osmin',
      body: 'Un minuto para marcar los hábitos y escribir cómo ha ido.',
      // Sin `repeats` esto sonaría una sola vez; con él, cada día a esa hora.
      schedule: { on: { hour, minute }, repeats: true, allowWhileIdle: true },
    }],
  })

  writeReminder(next)
  return next
}

/**
 * Reprograma al arrancar. iOS conserva los avisos entre ejecuciones, pero los
 * pierde si se reinstala la app o se restaura el teléfono, y entonces la
 * preferencia guardada diría que hay recordatorio cuando ya no queda ninguno.
 */
export async function restoreReminder(): Promise<void> {
  if (!supportsReminders()) return
  const saved = readReminder()
  if (!saved.enabled) return
  try {
    const LocalNotifications = await plugin()
    const { notifications } = await LocalNotifications.getPending()
    if (notifications.some(n => n.id === ID)) return
    await applyReminder(saved)
  } catch (err) {
    console.error('[Osmin] no se pudo restaurar el recordatorio:', err)
  }
}
