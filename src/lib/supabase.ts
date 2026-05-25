import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

/**
 * Crea el cliente de Supabase inyectando el JWT de Clerk en cada petición REST.
 * Compatible con la integración nativa Clerk → Supabase (Third-party Auth).
 * getToken debe devolver el JWT ya resuelto para cada llamada.
 */
export function makeSupabaseClient(getToken: () => Promise<string | null>) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      fetch: async (url: RequestInfo | URL, options: RequestInit = {}) => {
        const token = await getToken()
        const headers = new Headers(options.headers)
        headers.set('apikey', SUPABASE_ANON_KEY)
        if (token) {
          headers.set('Authorization', `Bearer ${token}`)
        }
        return fetch(url, { ...options, headers })
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
