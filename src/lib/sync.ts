import 'server-only'
import { sendAbandonedEmails } from '@/lib/email'
import { addDays, todayInChile } from '@/lib/dates'
import { parseICS } from '@/lib/ical'
import { supabaseAdmin } from '@/lib/supabase/admin'

type Feed = { id: string; cabin_id: string; channel: 'booking' | 'airbnb' | 'hospitable'; ical_url: string }

export type SyncResult = { feedId: string; channel: string; ok: boolean; events: number; error?: string }

async function syncFeed(feed: Feed): Promise<SyncResult> {
  const db = supabaseAdmin()
  const startedAt = new Date().toISOString()
  try {
    const res = await fetch(feed.ical_url, {
      headers: { 'User-Agent': 'AltosDeCahuil-CalendarSync/1.0' },
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('La URL no devolvió un calendario iCal')

    const minDate = addDays(todayInChile(), -1)
    let events = parseICS(text).filter((e) => e.end >= minDate)

    // Hospitable puede devolvernos nuestras propias reservas/bloqueos (los importa desde nuestra web):
    // se descartan los que coinciden exactamente con algo que ya tenemos.
    if (feed.channel === 'hospitable' && events.length) {
      const [{ data: own }, { data: blocks }] = await Promise.all([
        db.from('bookings').select('check_in, check_out').eq('cabin_id', feed.cabin_id).in('status', ['confirmed', 'pending']).gte('check_out', minDate),
        db.from('blocks').select('start_date, end_date').eq('cabin_id', feed.cabin_id).gte('end_date', minDate),
      ])
      const mine = new Set([...(own ?? []).map((b) => `${b.check_in}|${b.check_out}`), ...(blocks ?? []).map((k) => `${k.start_date}|${k.end_date}`)])
      events = events.filter((e) => !mine.has(`${e.start}|${e.end}`) && !/altosdecahuil/i.test(e.uid))
    }

    if (events.length) {
      const { error } = await db.from('external_events').upsert(
        events.map((e) => ({
          feed_id: feed.id,
          cabin_id: feed.cabin_id,
          channel: feed.channel,
          uid: e.uid,
          start_date: e.start,
          end_date: e.end,
          summary: e.summary.slice(0, 200),
          last_seen_at: startedAt,
        })),
        { onConflict: 'feed_id,uid' },
      )
      if (error) throw error
    }
    // Lo que ya no viene en el calendario se canceló en el canal: se borra.
    const { error: delErr } = await db.from('external_events').delete().eq('feed_id', feed.id).lt('last_seen_at', startedAt)
    if (delErr) throw delErr

    await db
      .from('channel_feeds')
      .update({ last_synced_at: startedAt, last_status: 'ok', last_event_count: events.length })
      .eq('id', feed.id)
    return { feedId: feed.id, channel: feed.channel, ok: true, events: events.length }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await db.from('channel_feeds').update({ last_synced_at: startedAt, last_status: `error: ${msg}`.slice(0, 300) }).eq('id', feed.id)
    return { feedId: feed.id, channel: feed.channel, ok: false, events: 0, error: msg }
  }
}

/** Sincroniza los calendarios de Booking/Airbnb (de una cabaña o de todas). */
export async function syncChannels(cabinId?: string): Promise<SyncResult[]> {
  let q = supabaseAdmin().from('channel_feeds').select('id, cabin_id, channel, ical_url')
  if (cabinId) q = q.eq('cabin_id', cabinId)
  const { data, error } = await q
  if (error) throw error
  return Promise.all(((data ?? []) as Feed[]).map(syncFeed))
}

/** Marca como vencidas las reservas pendientes cuyo plazo de pago terminó. */
export async function expirePendingBookings() {
  const { data, error } = await supabaseAdmin()
    .from('bookings')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('*, cabins(name, slug)')
  if (error) throw error
  if (data?.length) await sendAbandonedEmails(data).catch((e) => console.error(e))
  return data?.length ?? 0
}
