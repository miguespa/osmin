import { Capacitor } from '@capacitor/core'
// Import estático a propósito. Cargarlo con `await import(...)` dentro del
// WebView deja la promesa pendiente para siempre: ni resuelve ni falla, así que
// el interruptor se quedaba pulsado sin programar nada y sin dar ningún error.
import { LocalNotifications } from '@capacitor/local-notifications'

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

/**
 * Un aviso por día de la semana, en vez de uno solo repetido.
 *
 * Con un único aviso repetido, iOS enseña el mismo texto los 365 días y en una
 * semana ya no se lee. Programando siete, cada uno repetido semanalmente, el
 * mensaje cambia a diario y además distingue entre semana y fin de semana, igual
 * que hacen los marcadores de posición del diario.
 *
 * Los identificadores son fijos —del 1 al 7, en el orden de `Weekday` de
 * Capacitor, donde el 1 es domingo— porque al reprogramar hay que pisar los
 * avisos anteriores en lugar de acumularlos.
 */
const MENSAJES: { weekday: number; title: string; body: string }[] = [
  { weekday: 1, title: '¿Qué tal el domingo? ☀️',            body: 'Cierra el finde: marca tus hábitos y deja la nota del día.' },
  { weekday: 2, title: '¿Cómo ha ido el lunes? ☕',           body: 'Un minuto para marcar los hábitos y contar cómo ha ido.' },
  { weekday: 3, title: 'Cuéntame, ¿cómo ha ido hoy? 👀',      body: 'Marca tus hábitos y deja tu nota antes de que se te pase.' },
  { weekday: 4, title: '¿Qué ha sido lo mejor del día? 📝',   body: 'Mitad de semana. En un minuto lo dejas cerrado.' },
  { weekday: 5, title: '¿Qué te llevas de hoy? 🌿',           body: 'Marca los hábitos y escribe tu nota del día.' },
  { weekday: 6, title: '¿Qué tal ha salido el viernes? ✨',   body: 'Cierra la semana con tu día al día.' },
  { weekday: 7, title: '¿Día tranquilo o movidito? 🙂',       body: 'Marca lo que has hecho y deja tu nota del sábado.' },
]

const IDS = MENSAJES.map(m => m.weekday)

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

/**
 * Deja el aviso del teléfono igual que la preferencia recibida y la guarda.
 * Devuelve lo que ha quedado: si el usuario deniega el permiso vuelve apagado,
 * para que la interfaz no prometa un aviso que no va a llegar.
 */
export async function applyReminder(next: Reminder): Promise<Reminder> {
  if (!supportsReminders()) return next

  await LocalNotifications.cancel({ notifications: IDS.map(id => ({ id })) })

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
    notifications: MENSAJES.map(({ weekday, title, body }) => ({
      id: weekday,
      title,
      body,
      // Sin `repeats` esto sonaría una sola vez; con él, cada semana ese día.
      schedule: { on: { weekday, hour, minute }, repeats: true, allowWhileIdle: true },
    })),
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
    const { notifications } = await LocalNotifications.getPending()
    // Se reprograman los siete si falta alguno: una serie a medias avisaría unos
    // días sí y otros no, que es peor que no tener recordatorio.
    if (IDS.every(id => notifications.some(n => n.id === id))) return
    await applyReminder(saved)
  } catch (err) {
    console.error('[Osmin] no se pudo restaurar el recordatorio:', err)
  }
}
