// Tipos y helpers compartidos del panel (cliente y servidor).
import type { Booking } from '@/lib/types'

export type CabinLite = { id: string; slug: string; name: string; capacity: number; price_per_night: number; cleaning_fee: number; min_nights: number }

export type ItemKind = 'direct' | 'manual' | 'pending' | 'booking' | 'airbnb' | 'block' | 'closed'

/** Algo que ocupa noches de una cabaña en el calendario. end = día de salida (exclusivo). */
export type CalItem = {
  key: string
  kind: ItemKind
  cabinId: string
  start: string
  end: string
  label: string
  bookingId?: string
  blockId?: string
  reason?: string
  /** Solo eventos de Booking/Airbnb */
  channel?: 'booking' | 'airbnb'
  eventId?: string
}

export const CHANNEL_NAME = { booking: 'Booking.com', airbnb: 'Airbnb' } as const

export type AdminBooking = Booking & { cabin_name: string }

export const KIND_LABEL: Record<ItemKind, string> = {
  direct: 'Web (Mercado Pago)',
  manual: 'Manual',
  pending: 'Esperando pago',
  booking: 'Booking.com',
  airbnb: 'Airbnb',
  block: 'Bloqueado',
  closed: 'Cerrado en Booking/Airbnb',
}

export const KIND_BAR: Record<ItemKind, string> = {
  direct: 'bg-amber text-amber-ink',
  manual: 'bg-[#C98A4F] text-amber-ink',
  pending: 'border border-dashed border-amber bg-amber/10 text-amber-light',
  booking: 'bg-[#3D6FD6] text-white',
  airbnb: 'bg-[#8A3F38] text-[#FFE9E5] ring-1 ring-inset ring-[#E6837A]/70',
  block: 'bg-[repeating-linear-gradient(45deg,#3A332C_0_6px,#2A2521_6px_12px)] text-sub',
  closed: 'bg-[repeating-linear-gradient(45deg,#2A3040_0_6px,#20242E_6px_12px)] text-[#AEB9D3] ring-1 ring-inset ring-[#5B7BC4]/35',
}

export const STATUS: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'gray' | 'blue' }> = {
  confirmed: { label: 'Confirmada', tone: 'green' },
  pending: { label: 'Esperando pago', tone: 'amber' },
  cancelled: { label: 'Cancelada', tone: 'gray' },
  expired: { label: 'No pagó', tone: 'gray' },
}

export const PAYMENT_METHODS = [
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'mercadopago', label: 'Mercado Pago' },
  { id: 'otro', label: 'Otro' },
]

export function paymentState(b: Pick<Booking, 'total' | 'amount_paid' | 'status'>): { label: string; tone: 'green' | 'amber' | 'red' | 'gray' } {
  if (b.status === 'cancelled' || b.status === 'expired') return { label: '—', tone: 'gray' }
  if (b.amount_paid >= b.total && b.total > 0) return { label: 'Pagada', tone: 'green' }
  if (b.amount_paid > 0) return { label: 'Abono', tone: 'amber' }
  return { label: 'Sin pago', tone: 'red' }
}

export type ActionResult = { ok: true; message?: string; id?: string } | { ok: false; error: string }
