'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { IconEye, IconEyeOff } from '@/components/icons'
import { supabaseBrowser } from '@/lib/supabase/browser'
import { REMEMBER_COOKIE } from '@/lib/supabase/remember'

const input = 'fx-field min-h-[50px] w-full rounded-[10px] border border-cream/20 bg-ink px-3.5 text-base text-cream'
const SAVED_EMAIL = 'ac_admin_email'

export function LoginForm() {
  const router = useRouter()
  const emailRef = useRef<HTMLInputElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [show, setShow] = useState(false)

  // Completa el correo guardado la última vez que marcaron "Recordarme"
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVED_EMAIL)
      if (saved && emailRef.current && !emailRef.current.value) emailRef.current.value = saved
    } catch {}
  }, [])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const email = String(fd.get('email')).trim()
    const remember = fd.get('remember') === 'on'
    setLoading(true)
    setError(null)
    // Antes de iniciar sesión: define si la sesión dura (400 días) o solo hasta cerrar el navegador
    document.cookie = `${REMEMBER_COOKIE}=${remember ? '1' : '0'}; path=/; max-age=${400 * 24 * 3600}; samesite=lax`
    try {
      if (remember) localStorage.setItem(SAVED_EMAIL, email)
      else localStorage.removeItem(SAVED_EMAIL)
    } catch {}
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password: String(fd.get('password')) })
    if (error) {
      setError('Correo o contraseña incorrectos.')
      setLoading(false)
      return
    }
    router.replace('/admin')
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
      <label className="flex flex-col gap-2 text-sm font-semibold">
        Correo
        <input ref={emailRef} name="email" type="email" required autoComplete="username email" className={input} />
      </label>
      <div className="flex flex-col gap-2 text-sm font-semibold">
        <label htmlFor="password">Contraseña</label>
        <div className="relative">
          <input id="password" name="password" type={show ? 'text' : 'password'} required autoComplete="current-password" className={`${input} pr-12`} />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={show}
            className="absolute inset-y-0 right-1 my-auto flex h-10 w-10 items-center justify-center rounded-lg text-muted transition-colors hover:text-cream"
          >
            {show ? <IconEyeOff size={20} /> : <IconEye size={20} />}
          </button>
        </div>
      </div>
      <label className="flex cursor-pointer items-center gap-3 text-sm text-sub">
        <input type="checkbox" name="remember" defaultChecked className="h-5 w-5 accent-amber" />
        Recordarme en este dispositivo
      </label>
      {error && <p role="alert" className="text-sm text-amber-light">{error}</p>}
      <button type="submit" disabled={loading} className="fx-btn mt-2 min-h-[52px] rounded-full bg-amber font-bold text-amber-ink">
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
