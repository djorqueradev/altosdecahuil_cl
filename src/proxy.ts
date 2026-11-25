import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { REMEMBER_COOKIE, applyRemember } from '@/lib/supabase/remember'

// Refresca la sesión de Supabase en el panel y manda al login a quien no la tenga.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          const remember = request.cookies.get(REMEMBER_COOKIE)?.value !== '0'
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, applyRemember(options, remember)))
        },
      },
    },
  )

  // getClaims valida el token localmente (sin ir al servidor de Auth en cada clic) y lo refresca si venció.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims?.sub ? data.claims : null

  const isLogin = request.nextUrl.pathname.startsWith('/admin/login')
  if (!user && !isLogin) {
    const url = request.nextUrl.clone()
    url.pathname = '/admin/login'
    return NextResponse.redirect(url)
  }
  return response
}

export const config = {
  matcher: ['/admin/:path*'],
}
