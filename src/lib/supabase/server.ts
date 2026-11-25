import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { env } from '@/lib/env'
import { REMEMBER_COOKIE, applyRemember } from './remember'

/** Cliente con la sesión del usuario (para el login del panel). */
export async function supabaseServer() {
  const cookieStore = await cookies()
  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          const remember = cookieStore.get(REMEMBER_COOKIE)?.value !== '0'
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, applyRemember(options, remember)))
        } catch {
          // Llamado desde un Server Component: el proxy refresca la sesión.
        }
      },
    },
  })
}
