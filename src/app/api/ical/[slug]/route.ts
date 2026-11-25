import { addDays, todayInChile } from '@/lib/dates'
import { buildICS, type ICalEvent } from '@/lib/ical'
import { supabaseAdmin } from '@/lib/supabase/admin'

/**
 * Calendario de ocupación de una cabaña para importar en Booking.com / Airbnb.
 * /api/ical/cabana-1?token=…&exclude=booking   (exclude evita devolverle a un canal sus propias reservas)
 */
export async function GET(req: Request, ctx: RouteContext<'/api/ical/[slug]'>) {
  const { slug } = await ctx.params
  const url = new URL(req.url)
  const token = url.searchParams.get('token') || ''
  const exclude = url.searchParams.get('exclude')

  const db = supabaseAdmin()
  const { data: cabin } = await db.from('cabins').select('id, name, ical_export_token').eq('slug', slug).maybeSingle()
  if (!cabin || !token || token !== cabin.ical_export_token) return new Response('No encontrado', { status: 404 })

  const from = addDays(todayInChile(), -30)
  const nowIso = new Date().toISOString()

  const [bookings, blocks, external] = await Promise.all([
    db
      .from('bookings')
      .select('id, check_in, check_out, status, expires_at')
      .eq('cabin_id', cabin.id)
      .in('status', ['confirmed', 'pending'])
      .gte('check_out', from),
    db.from('blocks').select('id, start_date, end_date').eq('cabin_id', cabin.id).gte('end_date', from),
    db.from('external_busy').select('id, channel, start_date, end_date').eq('cabin_id', cabin.id).gte('end_date', from),
  ])

  const events: ICalEvent[] = [
    ...(bookings.data ?? [])
      .filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso))
      .map((b) => ({ uid: `booking-${b.id}@altosdecahuil`, start: b.check_in, end: b.check_out, summary: 'Reservado' })),
    ...(blocks.data ?? []).map((k) => ({ uid: `block-${k.id}@altosdecahuil`, start: k.start_date, end: k.end_date, summary: 'No disponible' })),
    ...(external.data ?? [])
      .filter((e) => e.channel !== exclude)
      .map((e) => ({ uid: `ext-${e.id}-${e.start_date}@altosdecahuil`, start: e.start_date, end: e.end_date, summary: 'No disponible' })),
  ]

  return new Response(buildICS(`Altos de Cahuil · ${cabin.name}`, events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
