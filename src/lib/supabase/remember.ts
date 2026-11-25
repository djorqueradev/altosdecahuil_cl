// "Recordarme" del login: si no se marca, la sesión dura hasta cerrar el navegador.
export const REMEMBER_COOKIE = 'ac_remember'

type CookieOpts = { maxAge?: number; expires?: Date }

/** Quita la duración de las cookies de sesión cuando el usuario no quiso que lo recuerden. */
export function applyRemember<T extends CookieOpts | undefined>(options: T, remember: boolean): T {
  if (remember || !options) return options
  if (options.maxAge !== undefined && options.maxAge <= 0) return options // borrar cookie: se respeta
  const rest = { ...options }
  delete rest.maxAge
  delete rest.expires
  return rest as T
}
