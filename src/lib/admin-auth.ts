import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'

/**
 * Exige un usuario autenticado que esté en la tabla `admins`.
 * Valida el token localmente (getClaims) y se calcula una sola vez por solicitud.
 */
export const requireAdmin = cache(async () => {
  const supabase = await supabaseServer()
  const { data: auth } = await supabase.auth.getClaims()
  const claims = auth?.claims
  if (!claims?.sub) redirect('/admin/login')
  const { data } = await supabaseAdmin().from('admins').select('user_id').eq('user_id', claims.sub).maybeSingle()
  if (!data) redirect('/admin/login?error=sin-acceso')
  return { id: claims.sub, email: (claims.email as string | undefined) ?? '' }
})
