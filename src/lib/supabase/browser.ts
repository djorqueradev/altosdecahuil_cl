'use client'
import { createBrowserClient } from '@supabase/ssr'
import { parse, serialize, type SerializeOptions } from 'cookie'
import { REMEMBER_COOKIE, applyRemember } from './remember'

export function supabaseBrowser() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return Object.entries(parse(document.cookie)).map(([name, value]) => ({ name, value: value ?? '' }))
      },
      setAll(cookiesToSet) {
        const remember = parse(document.cookie)[REMEMBER_COOKIE] !== '0'
        for (const { name, value, options } of cookiesToSet) {
          document.cookie = serialize(name, value, applyRemember(options as SerializeOptions, remember))
        }
      },
    },
  })
}
