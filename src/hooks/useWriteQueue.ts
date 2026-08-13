import { useCallback, useEffect, useRef, useState } from 'react'
import type { SupabaseClient } from '../lib/supabase'
import type { Month, SyncState } from '../types'
import {
  createMonthInDB, saveDayToDB, saveHabitsToDB, saveGoalsToDB,
  fetchMonthRevision, errorCode, ERR_CONFLICT, ERR_STALE,
} from '../lib/db'

/**
 * Una escritura pendiente, nombrada por la intención del usuario que la originó.
 *
 * Este es el cambio que cierra de raíz las pérdidas de datos de julio y agosto
 * de 2026. Antes, el guardado era un `useEffect` que comparaba `months` con la
 * última copia guardada y reescribía el mes entero de todo lo que hubiera
 * cambiado. Con ese diseño, un estado fabricado por el cliente (un mes en blanco
 * creado tras un 401 en la carga) "había cambiado" respecto a nada, y se
 * persistía encima de los datos reales.
 *
 * Ahora las escrituras nacen de la acción del usuario, no de comparar estados.
 * Si el usuario no toca nada, la cola está vacía y no se escribe absolutamente
 * nada, por muy corrupto que esté lo que haya en memoria.
 */
export type PendingWrite =
  | { kind: 'create'; year: number; month: number }
  | { kind: 'day';    year: number; month: number; day: number }
  | { kind: 'habits'; year: number; month: number }
  | { kind: 'goals';  year: number; month: number }

function writeKey(w: PendingWrite): string {
  return w.kind === 'day' ? `day:${w.year}-${w.month}-${w.day}` : `${w.kind}:${w.year}-${w.month}`
}

// Crear el mes va siempre primero: las demás operaciones exigen que el mes ya
// exista en el servidor y fallan con OSM01 si no. Sin este orden explícito, una
// creación que falla por red y se reencola podría quedar por detrás de una
// edición de día encolada mientras tanto.
const KIND_ORDER: Record<PendingWrite['kind'], number> = { create: 0, habits: 1, goals: 2, day: 3 }

function inWriteOrder(writes: PendingWrite[]): PendingWrite[] {
  return [...writes].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
}

export interface SyncStatus {
  state: SyncState
  pending: number
  lastSavedAt: Date | null
  message: string
}

const DEBOUNCE_MS = 800
const RETRY_DELAYS = [1000, 3000, 8000, 20000]

interface Options {
  supabase: SupabaseClient
  userId: string | null | undefined
  /** Estado vivo de los meses: la cola lee de aquí al vaciarse, no del cierre. */
  monthsRef: React.MutableRefObject<Month[]>
  /** Fija la revisión que devuelve el servidor tras escribir hábitos o hitos. */
  onRevision: (year: number, month: number, revision: number) => void
  /** El servidor y el cliente no coinciden: hay que recargar del servidor. */
  onNeedsReload: (reason: string) => void
}

export function useWriteQueue({ supabase, userId, monthsRef, onRevision, onNeedsReload }: Options) {
  const queue = useRef<Map<string, PendingWrite>>(new Map())
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const flushing = useRef(false)
  const failures = useRef(0)
  const [sync, setSync] = useState<SyncStatus>({ state: 'idle', pending: 0, lastSavedAt: null, message: '' })

  const findMonth = (year: number, month: number) =>
    monthsRef.current.find(m => m.year === year && m.month === month)

  const runWrite = useCallback(async (w: PendingWrite): Promise<void> => {
    const m = findMonth(w.year, w.month)
    // El mes ya no está en memoria (p. ej. el usuario lo borró): nada que escribir.
    if (!m) return

    if (w.kind === 'create') {
      try {
        await createMonthInDB(supabase, m)
      } catch (err) {
        // OSM01 = el mes ya existía en el servidor. Crear nunca sobrescribe, así
        // que lo correcto es recargar y quedarse con lo que hay en el servidor.
        if (errorCode(err) === ERR_CONFLICT) { onNeedsReload('El mes ya existía en el servidor'); return }
        throw err
      }
      return
    }

    if (w.kind === 'day') {
      const day = m.days.find(d => d.day === w.day)
      if (!day) return
      try {
        await saveDayToDB(supabase, w.year, w.month, day)
      } catch (err) {
        // OSM01 = el mes no existe en el servidor. Escribir un día jamás lo crea:
        // esa es justamente la separación que evita que una edición suelta
        // materialice un mes fantasma. Recargamos.
        if (errorCode(err) === ERR_CONFLICT) { onNeedsReload('El mes no existe en el servidor'); return }
        throw err
      }
      return
    }

    // habits / goals: operaciones destructivas → concurrencia optimista.
    const write = async (baseRevision?: number) => w.kind === 'habits'
      ? saveHabitsToDB(supabase, w.year, w.month, m.habits, baseRevision)
      : saveGoalsToDB(supabase, w.year, w.month, m.goals, baseRevision)

    try {
      onRevision(w.year, w.month, await write(m.revision))
    } catch (err) {
      if (errorCode(err) !== ERR_STALE || !userId) throw err
      // Otro dispositivo escribió entretanto: recargamos la revisión y
      // reintentamos una vez. Gana la última escritura, que es lo acordado.
      const fresh = await fetchMonthRevision(supabase, userId, w.year, w.month)
      if (fresh == null) { onNeedsReload('El mes ya no existe en el servidor'); return }
      onRevision(w.year, w.month, await write(fresh))
    }
  }, [supabase, userId, onRevision, onNeedsReload])

  const flush = useCallback(async () => {
    if (flushing.current || !userId || queue.current.size === 0) return
    flushing.current = true
    setSync(s => ({ ...s, state: 'saving', pending: queue.current.size }))

    const pending = inWriteOrder([...queue.current.values()])
    queue.current.clear()
    const failed: PendingWrite[] = []
    let lastMessage = ''

    for (const w of pending) {
      try {
        await runWrite(w)
      } catch (err) {
        // La escritura vuelve a la cola: no se descarta nada por un fallo de red.
        failed.push(w)
        lastMessage = err instanceof Error ? err.message : String(err)
        console.error('[Osmin] escritura fallida', writeKey(w), err)
      }
    }

    for (const w of failed) if (!queue.current.has(writeKey(w))) queue.current.set(writeKey(w), w)
    flushing.current = false

    if (failed.length === 0) {
      failures.current = 0
      setSync({ state: 'idle', pending: queue.current.size, lastSavedAt: new Date(), message: '' })
    } else {
      const attempt = failures.current++
      setSync(s => ({ ...s, state: 'error', pending: queue.current.size, message: lastMessage }))
      const delay = RETRY_DELAYS[Math.min(attempt, RETRY_DELAYS.length - 1)]
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => { void flush() }, delay)
    }
  }, [userId, runWrite])

  const enqueue = useCallback((w: PendingWrite) => {
    queue.current.set(writeKey(w), w)
    setSync(s => ({ ...s, state: s.state === 'error' ? 'error' : 'saving', pending: queue.current.size }))
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void flush() }, DEBOUNCE_MS)
  }, [flush])

  /** Vacía la cola ya, sin esperar al debounce. */
  const flushNow = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    void flush()
  }, [flush])

  // En Safari iOS los timers mueren al pasar la pestaña a segundo plano: sin
  // esto se pierde lo escrito en los últimos 800 ms al bloquear el móvil.
  useEffect(() => {
    const onHide = () => { if (queue.current.size > 0) flushNow() }
    const onVisibility = () => { if (document.visibilityState === 'hidden') onHide() }
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (queue.current.size > 0 || flushing.current) { e.preventDefault(); e.returnValue = '' }
    }
    window.addEventListener('pagehide', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('pagehide', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [flushNow])

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  return { enqueue, flushNow, sync }
}
