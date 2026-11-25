import 'server-only'
import { diffDays } from '@/lib/dates'
import { supabaseAdmin } from '@/lib/supabase/admin'
import type { Booking } from '@/lib/types'
import { CHANNEL_NAME, type AdminBooking, type CalItem } from '../_components/model'

type BookingRow = Booking & { cabins: { name: string } | null }

type ExternalRow = { id: string; cabin_id: string; channel: 'booking' | 'airbnb'; summary: string | null; start_date: string; end_date: string; orig_start: string; orig_end: string }

/**
 * ¿El evento importado es una reserva o solo un cierre de fechas?
 * Airbnb lo dice ("Reserved" vs "Not available"). Booking siempre manda "CLOSED - Not available",
 * así que tomamos como cierre lo que dura más de 30 noches.
 */
export function isChannelReservation(e: Pick<ExternalRow, 'channel' | 'summary' | 'orig_start' | 'orig_end'>) {
  if (e.channel === 'airbnb') return /reserv/i.test(e.summary ?? '')
  return diffDays(e.orig_start, e.orig_end) <= 30
}

export function toAdminBooking(b: BookingRow): AdminBooking {
  const { cabins, ...rest } = b
  return { ...rest, cabin_name: cabins?.name ?? '' }
}

/** Todo lo que ocupa noches entre [from, to): reservas vigentes, bloqueos y eventos de Booking/Airbnb. */
export async function loadOccupancy(from: string, to: string) {
  const db = supabaseAdmin()
  const nowIso = new Date().toISOString()
  const [bookings, blocks, external] = await Promise.all([
    db.from('bookings').select('*, cabins(name)').in('status', ['confirmed', 'pending']).lt('check_in', to).gt('check_out', from).order('check_in'),
    db.from('blocks').select('id, cabin_id, start_date, end_date, reason').lt('start_date', to).gt('end_date', from),
    db.from('external_busy').select('id, cabin_id, channel, summary, start_date, end_date, orig_start, orig_end').lt('start_date', to).gt('end_date', from),
  ])
  const live = ((bookings.data ?? []) as BookingRow[]).filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso))
  const adminBookings = live.map(toAdminBooking)

  const items: CalItem[] = [
    ...adminBookings.map<CalItem>((b) => ({
      key: `b-${b.id}`,
      kind: b.status === 'pending' ? 'pending' : b.source,
      cabinId: b.cabin_id,
      start: b.check_in,
      end: b.check_out,
      label: `${b.guest_first_name} ${b.guest_last_name !== '-' ? b.guest_last_name : ''}`.trim(),
      bookingId: b.id,
    })),
    ...(blocks.data ?? []).map<CalItem>((k) => ({
      key: `k-${k.id}`,
      kind: 'block',
      cabinId: k.cabin_id,
      start: k.start_date,
      end: k.end_date,
      label: k.reason,
      blockId: k.id,
      reason: k.reason,
    })),
    ...((external.data ?? []) as ExternalRow[]).map<CalItem>((e) => {
      const reservation = isChannelReservation(e)
      return {
        key: `e-${e.id}-${e.start_date}`,
        kind: reservation ? e.channel : 'closed',
        cabinId: e.cabin_id,
        start: e.start_date,
        end: e.end_date,
        label: reservation ? CHANNEL_NAME[e.channel] : `Cerrado en ${CHANNEL_NAME[e.channel]}`,
        channel: e.channel,
        eventId: e.id,
      }
    }),
  ]
  return { items, bookings: adminBookings }
}

/** Noches ocupadas por cabaña y por tipo, dentro de [from, to). */
export function nightsBreakdown(items: CalItem[], from: string, to: string) {
  const byKind: Record<string, number> = {}
  let sold = 0
  let blocked = 0
  for (const it of items) {
    if (it.kind === 'pending') continue
    const s = it.start > from ? it.start : from
    const e = it.end < to ? it.end : to
    const n = Math.max(0, Math.round((Date.parse(e) - Date.parse(s)) / 86_400_000))
    if (!n) continue
    byKind[it.kind] = (byKind[it.kind] ?? 0) + n
    if (it.kind === 'block' || it.kind === 'closed') blocked += n
    else sold += n
  }
  return { byKind, sold, blocked }
}
