'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireAdmin } from '@/lib/admin-auth'
import { getQuote } from '@/lib/data'
import { addDays, diffDays, isISODate, todayInChile } from '@/lib/dates'
import { isEmail, resendConfirmation, sendBookingCancelled, sendBookingConfirmed, sendEmail } from '@/lib/email'
import { renderTemplate, TEMPLATES, type TemplateId } from '@/lib/emails/templates'
import { env } from '@/lib/env'
import { getSettings } from '@/lib/settings'
import { sampleBooking } from '@/lib/emails/sample'
import type { Booking } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { supabaseServer } from '@/lib/supabase/server'
import { syncChannels } from '@/lib/sync'
import type { ActionResult } from './_components/model'

const fail = (error: string): ActionResult => ({ ok: false, error })
const done = (message?: string, id?: string): ActionResult => {
  revalidatePath('/admin', 'layout')
  return { ok: true, message, id }
}

// ---------------------------------------------------------------- Sesión
export async function signOut() {
  const supabase = await supabaseServer()
  await supabase.auth.signOut()
  redirect('/admin/login')
}

// ---------------------------------------------------------------- Canales
export async function syncNowAction(): Promise<ActionResult> {
  await requireAdmin()
  const results = await syncChannels()
  if (!results.length) return fail('Aún no has conectado calendarios de Booking o Airbnb (sección Canales).')
  const failed = results.filter((r) => !r.ok)
  if (failed.length) return fail(`No se pudo leer ${failed.length} calendario(s): ${failed[0].error}`)
  return done(`Sincronizado: ${results.reduce((n, r) => n + r.events, 0)} reservas de Booking/Airbnb al día.`)
}

// ---------------------------------------------------------------- Cotizar / disponibilidad
export type QuoteResult =
  | { ok: true; nights: number; subtotal: number; cleaningFee: number; total: number; minNights: number; unpriced: boolean; conflicts: string[] }
  | { ok: false; error: string }

export async function quoteAction(cabinId: string, checkIn: string, checkOut: string): Promise<QuoteResult> {
  await requireAdmin()
  if (!isISODate(checkIn) || !isISODate(checkOut) || checkOut <= checkIn) return { ok: false, error: 'Fechas inválidas' }
  const db = supabaseAdmin()
  const [q, busy] = await Promise.all([
    getQuote(cabinId, checkIn, checkOut),
    db.rpc('cabin_busy_ranges', { p_cabin: cabinId, p_from: checkIn, p_to: checkOut }),
  ])
  const conflicts = ((busy.data ?? []) as { start_date: string; end_date: string; kind: string }[]).map((r) => {
    const k = r.kind === 'booking' ? 'otra reserva' : r.kind === 'block' ? 'un bloqueo' : r.kind === 'airbnb' ? 'Airbnb' : r.kind === 'hospitable' ? 'una reserva de Airbnb/Booking' : 'Booking.com'
    return `${k} (${r.start_date} → ${r.end_date})`
  })
  return {
    ok: true,
    nights: q.nights,
    subtotal: q.subtotal,
    cleaningFee: q.cleaning_fee,
    total: q.total,
    minNights: q.min_nights,
    unpriced: q.has_unpriced,
    conflicts,
  }
}

// ---------------------------------------------------------------- Reservas
const NewBooking = z.object({
  cabinId: z.string().uuid('Elige una cabaña'),
  checkIn: z.string().refine(isISODate, 'Elige la llegada'),
  checkOut: z.string().refine(isISODate, 'Elige la salida'),
  guests: z.number().int().min(1).max(20),
  firstName: z.string().trim().min(1, 'Escribe el nombre del huésped'),
  lastName: z.string().trim().default(''),
  phone: z.string().trim().default(''),
  email: z.string().trim().default(''),
  sendEmail: z.boolean().default(false),
  total: z.number().int().min(0),
  amountPaid: z.number().int().min(0),
  paymentMethod: z.string().trim().default(''),
  notes: z.string().trim().default(''),
})

export async function createManualBookingAction(input: z.input<typeof NewBooking>): Promise<ActionResult> {
  await requireAdmin()
  const p = NewBooking.safeParse(input)
  if (!p.success) return fail(p.error.issues[0]?.message ?? 'Revisa los datos')
  const m = p.data
  if (m.checkOut <= m.checkIn) return fail('La salida debe ser después de la llegada.')
  const db = supabaseAdmin()
  const { data: busy } = await db.rpc('cabin_busy_ranges', { p_cabin: m.cabinId, p_from: m.checkIn, p_to: m.checkOut })
  if (busy && busy.length) return fail('Esas fechas ya están ocupadas en esa cabaña.')
  const nights = diffDays(m.checkIn, m.checkOut)
  const { data, error } = await db
    .from('bookings')
    .insert({
      cabin_id: m.cabinId,
      check_in: m.checkIn,
      check_out: m.checkOut,
      guests: m.guests,
      guest_first_name: m.firstName,
      guest_last_name: m.lastName || '-',
      guest_email: m.email || '-',
      guest_phone: m.phone || '-',
      internal_notes: m.notes || null,
      price_per_night: nights ? Math.round(m.total / nights) : m.total,
      subtotal: m.total,
      cleaning_fee: 0,
      total: m.total,
      amount_paid: Math.min(m.amountPaid, m.total),
      payment_method: m.paymentMethod || null,
      status: 'confirmed',
      source: 'manual',
      paid_at: m.amountPaid > 0 ? new Date().toISOString() : null,
      send_emails: m.sendEmail && isEmail(m.email),
    })
    .select('*')
    .single()
  if (error) return fail(error.message.includes('bookings_no_overlap') ? 'Esas fechas ya están ocupadas.' : error.message)
  let note = ''
  if (m.sendEmail && isEmail(m.email)) {
    await sendBookingConfirmed(data as Booking, '').catch((e) => console.error(e))
    note = ' Le enviamos la confirmación por correo.'
  }
  return done(`Reserva ${data.code} creada.${note}`, data.id)
}

const Patch = z.object({
  guest_first_name: z.string().trim().min(1).optional(),
  guest_last_name: z.string().trim().optional(),
  guest_phone: z.string().trim().optional(),
  guest_email: z.string().trim().optional(),
  guests: z.number().int().min(1).max(20).optional(),
  arrival_window: z.string().trim().optional(),
  internal_notes: z.string().trim().optional(),
  total: z.number().int().min(0).optional(),
})

export async function updateBookingAction(id: string, patch: z.input<typeof Patch>): Promise<ActionResult> {
  await requireAdmin()
  const p = Patch.safeParse(patch)
  if (!p.success) return fail('Revisa los datos')
  const { error } = await supabaseAdmin().from('bookings').update(p.data).eq('id', id)
  if (error) return fail(error.message)
  return done('Cambios guardados.')
}

export async function setPaymentAction(id: string, amountPaid: number, method: string): Promise<ActionResult> {
  await requireAdmin()
  if (!Number.isFinite(amountPaid) || amountPaid < 0) return fail('Monto inválido')
  const db = supabaseAdmin()
  const { data: b } = await db.from('bookings').select('total').eq('id', id).single()
  if (!b) return fail('Reserva no encontrada')
  const amount = Math.min(Math.round(amountPaid), b.total)
  const { error } = await db
    .from('bookings')
    .update({ amount_paid: amount, payment_method: method || null, paid_at: amount > 0 ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return fail(error.message)
  return done(amount >= b.total ? 'Reserva marcada como pagada.' : 'Pago registrado.')
}

export async function cancelBookingAction(id: string, notify = true): Promise<ActionResult> {
  await requireAdmin()
  const { error } = await supabaseAdmin().from('bookings').update({ status: 'cancelled', expires_at: null }).eq('id', id)
  if (error) return fail(error.message)
  const sent = notify ? await sendBookingCancelled(id).catch(() => null) : null
  return done(`Reserva cancelada: las fechas quedaron libres.${sent?.ok ? ' Le avisamos al huésped por correo.' : ''}`)
}

export async function resendConfirmationAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  const r = await resendConfirmation(id)
  if (!r.ok) return fail(r.error)
  await supabaseAdmin().from('bookings').update({ send_emails: true }).eq('id', id)
  return done('Confirmación enviada al huésped.')
}

export async function clearAlertAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  await supabaseAdmin().from('bookings').update({ admin_alert: null }).eq('id', id)
  return done('Alerta marcada como resuelta.')
}

// ---------------------------------------------------------------- Bloqueos
export async function createBlockAction(cabinIds: string[], start: string, end: string, reason: string): Promise<ActionResult> {
  await requireAdmin()
  if (!cabinIds.length) return fail('Elige al menos una cabaña')
  if (!isISODate(start) || !isISODate(end) || end <= start) return fail('Revisa las fechas')
  const { error } = await supabaseAdmin()
    .from('blocks')
    .insert(cabinIds.map((cabin_id) => ({ cabin_id, start_date: start, end_date: end, reason: (reason || 'Bloqueado').slice(0, 120) })))
  if (error) return fail(error.message)
  return done('Fechas bloqueadas (también se bloquean en Booking y Airbnb).')
}

export async function deleteBlockAction(id: string): Promise<ActionResult> {
  await requireAdmin()
  const { error } = await supabaseAdmin().from('blocks').delete().eq('id', id)
  if (error) return fail(error.message)
  return done('Bloqueo eliminado.')
}

/**
 * Abre noches de una cabaña: quita/recorta bloqueos propios y libera las noches que
 * Booking/Airbnb marcan como cerradas. Nunca toca reservas (propias ni "Reserved" de Airbnb).
 */
export async function openDatesAction(cabinId: string, firstNight: string, lastNight: string): Promise<ActionResult> {
  await requireAdmin()
  if (!isISODate(firstNight) || !isISODate(lastNight) || lastNight < firstNight) return fail('Revisa las fechas.')
  const start = firstNight
  const end = addDays(lastNight, 1)
  const db = supabaseAdmin()
  const nowIso = new Date().toISOString()

  const [{ data: own }, { data: ext }, { data: blocks }] = await Promise.all([
    db.from('bookings').select('code, status, expires_at').eq('cabin_id', cabinId).in('status', ['confirmed', 'pending']).lt('check_in', end).gt('check_out', start),
    db.from('external_busy').select('channel, summary, orig_start, orig_end').eq('cabin_id', cabinId).lt('start_date', end).gt('end_date', start),
    db.from('blocks').select('id, start_date, end_date, reason').eq('cabin_id', cabinId).lt('start_date', end).gt('end_date', start),
  ])
  const ownLive = (own ?? []).filter((b) => b.status === 'confirmed' || (b.expires_at && b.expires_at > nowIso))
  if (ownLive.length) return fail(`En esas fechas hay una reserva (${ownLive.map((b) => b.code).join(', ')}). Cancélala si corresponde.`)
  if ((ext ?? []).some((e) => e.channel === 'airbnb' && /reserv/i.test(e.summary ?? ''))) {
    return fail('En esas fechas hay una reserva de Airbnb. Esa no se puede abrir desde aquí.')
  }

  // Bloqueos propios: borrar, recortar o partir
  let changed = 0
  for (const k of blocks ?? []) {
    changed++
    if (k.start_date >= start && k.end_date <= end) await db.from('blocks').delete().eq('id', k.id)
    else if (k.start_date < start && k.end_date > end) {
      await db.from('blocks').update({ end_date: start }).eq('id', k.id)
      await db.from('blocks').insert({ cabin_id: cabinId, start_date: end, end_date: k.end_date, reason: k.reason })
    } else if (k.start_date < start) await db.from('blocks').update({ end_date: start }).eq('id', k.id)
    else await db.from('blocks').update({ start_date: end }).eq('id', k.id)
  }

  if ((ext ?? []).length) {
    const { error } = await db.from('open_dates').insert({ cabin_id: cabinId, start_date: start, end_date: end, note: 'Abierto desde el panel' })
    if (error) return fail(error.message)
    changed++
  }
  if (!changed) return fail('Esas noches ya estaban libres.')
  return done('Fechas abiertas. Booking y Airbnb las verán libres en su próxima actualización.')
}

export async function reopenCloseAction(fd: FormData) {
  await requireAdmin()
  await supabaseAdmin().from('open_dates').delete().eq('id', str(fd, 'id'))
  revalidatePath('/admin', 'layout')
  back('/admin/canales', { ok: 'Listo: esas fechas vuelven a seguir lo que digan Booking/Airbnb.' })
}

// ---------------------------------------------------------------- Formularios de configuración (con redirect)
function back(path: string, params: Record<string, string>): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}${new URLSearchParams(params)}`)
}
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim()
const int = (fd: FormData, k: string) => Math.max(0, Math.round(Number(str(fd, k).replace(/[^\d]/g, '')) || 0))

export async function saveCabinAction(fd: FormData) {
  await requireAdmin()
  const id = str(fd, 'id')
  const to = str(fd, 'redirectTo') || '/admin/tarifas'
  const patch: Record<string, unknown> = {}
  if (fd.has('price_per_night')) patch.price_per_night = int(fd, 'price_per_night')
  if (fd.has('cleaning_fee')) patch.cleaning_fee = int(fd, 'cleaning_fee')
  if (fd.has('min_nights')) patch.min_nights = Math.max(1, int(fd, 'min_nights'))
  if (fd.has('capacity')) patch.capacity = Math.max(1, int(fd, 'capacity'))
  if (fd.has('name')) patch.name = str(fd, 'name')
  if (fd.has('bedrooms_summary')) patch.bedrooms_summary = str(fd, 'bedrooms_summary')
  if (fd.has('short_description')) patch.short_description = str(fd, 'short_description')
  if (fd.has('description')) patch.description = str(fd, 'description')
  if (fd.has('amenities')) patch.amenities = str(fd, 'amenities').split('\n').map((s) => s.trim()).filter(Boolean)
  if (fd.has('active_present')) patch.active = fd.get('active') === 'on'
  const { error } = await supabaseAdmin().from('cabins').update(patch).eq('id', id)
  if (error) back(to, { error: error.message })
  revalidatePath('/', 'layout')
  back(to, { ok: 'Cambios guardados.' })
}

export async function createRateAction(fd: FormData) {
  await requireAdmin()
  const start = str(fd, 'start_date')
  const end = str(fd, 'end_date') // último día (noche) de la temporada, inclusive → se guarda exclusivo
  const cabin = str(fd, 'cabin_id')
  const price = int(fd, 'price_per_night')
  const minN = int(fd, 'min_nights')
  if (!isISODate(start) || !isISODate(end) || end < start) back('/admin/tarifas', { error: 'Revisa las fechas de la temporada.' })
  if (price <= 0) back('/admin/tarifas', { error: 'El precio por noche debe ser mayor a 0.' })
  const endExclusive = new Date(end + 'T00:00:00Z')
  endExclusive.setUTCDate(endExclusive.getUTCDate() + 1)
  const { error } = await supabaseAdmin()
    .from('rates')
    .insert({
      cabin_id: cabin || null,
      label: str(fd, 'label') || 'Temporada',
      start_date: start,
      end_date: endExclusive.toISOString().slice(0, 10),
      price_per_night: price,
      min_nights: minN > 0 ? minN : null,
    })
  if (error) back('/admin/tarifas', { error: error.message })
  revalidatePath('/', 'layout')
  back('/admin/tarifas', { ok: 'Temporada creada.' })
}

export async function deleteRateAction(fd: FormData) {
  await requireAdmin()
  await supabaseAdmin().from('rates').delete().eq('id', str(fd, 'id'))
  revalidatePath('/', 'layout')
  back('/admin/tarifas', { ok: 'Temporada eliminada.' })
}

export async function saveSettingsAction(fd: FormData) {
  await requireAdmin()
  const hold = Math.min(120, Math.max(10, int(fd, 'payment_hold_minutes') || 30))
  const { error } = await supabaseAdmin()
    .from('settings')
    .update({
      check_in_from: str(fd, 'check_in_from'),
      check_in_until: str(fd, 'check_in_until'),
      check_out_until: str(fd, 'check_out_until'),
      cancellation_policy: str(fd, 'cancellation_policy'),
      pets_policy: str(fd, 'pets_policy'),
      house_rules: str(fd, 'house_rules'),
      payment_hold_minutes: hold,
      contact_phone: str(fd, 'contact_phone'),
      contact_email: str(fd, 'contact_email'),
      whatsapp: str(fd, 'whatsapp').replace(/\D/g, ''),
      instagram: str(fd, 'instagram'),
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) back('/admin/configuracion', { error: error.message })
  revalidatePath('/', 'layout')
  back('/admin/configuracion', { ok: 'Configuración guardada.' })
}

export async function saveFeedAction(fd: FormData) {
  await requireAdmin()
  const cabin_id = str(fd, 'cabin_id')
  const channel = str(fd, 'channel')
  const ical_url = str(fd, 'ical_url')
  if (!['booking', 'airbnb', 'hospitable'].includes(channel)) back('/admin/canales', { error: 'Canal inválido' })
  const db = supabaseAdmin()
  if (!ical_url) {
    await db.from('channel_feeds').delete().eq('cabin_id', cabin_id).eq('channel', channel)
    revalidatePath('/admin', 'layout')
    back('/admin/canales', { ok: 'Calendario desconectado.' })
  }
  if (!/^https:\/\//i.test(ical_url)) back('/admin/canales', { error: 'La URL debe comenzar con https://' })
  const { error } = await db.from('channel_feeds').upsert({ cabin_id, channel, ical_url }, { onConflict: 'cabin_id,channel' })
  if (error) back('/admin/canales', { error: error.message })
  const results = await syncChannels(cabin_id)
  const mine = results.find((r) => r.channel === channel)
  revalidatePath('/admin', 'layout')
  if (mine && !mine.ok) back('/admin/canales', { error: `Guardado, pero no se pudo leer el calendario: ${mine.error}` })
  back('/admin/canales', { ok: `Calendario conectado (${mine?.events ?? 0} reservas importadas).` })
}

// ---------------------------------------------------------------- Correos
export async function saveEmailSettingsAction(fd: FormData) {
  await requireAdmin()
  const notify = str(fd, 'notify_emails')
    .split(/[,;\s]+/)
    .filter(Boolean)
  const bad = notify.find((x) => !isEmail(x))
  if (bad) back('/admin/configuracion/correos', { error: `"${bad}" no parece un correo válido.` })
  const days = Math.min(7, Math.max(1, int(fd, 'reminder_days') || 2))
  const { error } = await supabaseAdmin()
    .from('settings')
    .update({
      notify_emails: notify.join(', '),
      email_reminders: fd.get('email_reminders') === 'on',
      reminder_days: days,
      email_thanks: fd.get('email_thanks') === 'on',
      email_abandoned: fd.get('email_abandoned') === 'on',
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
  if (error) back('/admin/configuracion/correos', { error: error.message })
  revalidatePath('/admin', 'layout')
  back('/admin/configuracion/correos', { ok: 'Correos automáticos guardados.' })
}

export async function sendTestEmailAction(fd: FormData) {
  const user = await requireAdmin()
  const id = str(fd, 'template') as TemplateId
  if (!TEMPLATES.some((t) => t.id === id)) back('/admin/configuracion/correos', { error: 'Plantilla inválida' })
  const to = user.email ?? ''
  const settings = await getSettings()
  const { booking, cabin } = await sampleBooking()
  const today = todayInChile()
  const email = renderTemplate(id, { siteUrl: env.siteUrl(), settings, booking, cabin }, today)
  const r = await sendEmail(to, { ...email, subject: `[Prueba] ${email.subject}` }, { tag: 'prueba' })
  if (!r.ok) back(`/admin/configuracion/correos?ver=${id}`, { error: `No se pudo enviar: ${r.error}` })
  back(`/admin/configuracion/correos?ver=${id}`, { ok: `Prueba enviada a ${to}. Revisa tu bandeja (y spam).` })
}
