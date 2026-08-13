import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

/** Margen para renovar el token antes de que caduque de verdad. */
const EXPIRY_MARGIN_MS = 60_000

/** Lee el `exp` de un JWT sin verificarlo — solo para saber cuándo renovarlo. */
function readExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const exp = JSON.parse(json).exp
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/**
 * Crea el cliente de Supabase inyectando el JWT de Clerk en cada petición REST.
 * Compatible con la integración nativa Clerk → Supabase (Third-party Auth).
 *
 * El 13-ago-2026 un `GET /months` devolvió 401 con un token caducado mientras
 * las peticiones hermanas del mismo `Promise.all` iban con uno válido. Aquel 401
 * fue el disparador de la pérdida de agosto, así que aquí:
 *   · se cachea el token y se renueva ~60 s antes de su `exp`, y
 *   · ante un 401 de respuesta se pide token nuevo y se reintenta UNA vez.
 *
 * Esto reduce los 401 transitorios. La garantía de que un fallo de red no puede
 * destruir datos no vive aquí, vive en el API de escritura por intención
 * (`create_month` / `save_day` / `save_habits` / `save_goals`) y en que la app
 * no escribe nada que el usuario no haya editado.
 */
export function makeSupabaseClient(getToken: () => Promise<string | null>) {
  let cached: { token: string; expiresAt: number | null } | null = null
  let inFlight: Promise<string | null> | null = null

  const fetchToken = async (force: boolean): Promise<string | null> => {
    if (!force && cached) {
      const fresh = cached.expiresAt === null || cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()
      if (fresh) return cached.token
    }
    // Varias peticiones en paralelo comparten una sola renovación.
    if (!inFlight) {
      inFlight = getToken()
        .then(token => {
          cached = token ? { token, expiresAt: readExpiry(token) } : null
          return token
        })
        .finally(() => { inFlight = null })
    }
    return inFlight
  }

  const withAuth = (options: RequestInit, token: string | null): RequestInit => {
    const headers = new Headers(options.headers)
    headers.set('apikey', SUPABASE_ANON_KEY)
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return { ...options, headers }
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const token = await fetchToken(false)
        const res = await fetch(url, withAuth(options, token))
        if (res.status !== 401) return res
        // Token rechazado: renovar y reintentar una vez. supabase-js manda el
        // cuerpo como string, así que se puede reenviar tal cual.
        cached = null
        const retryToken = await fetchToken(true)
        if (!retryToken || retryToken === token) return res
        return fetch(url, withAuth(options, retryToken))
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export type SupabaseClient = ReturnType<typeof makeSupabaseClient>
