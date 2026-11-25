import type { Metadata } from 'next'
import Link from 'next/link'
import { addDays, addMonths, diffDays, formatDate, formatDateFull, formatMonth, startOfMonth, todayInChile } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { OpenDetail, QuickActions } from '../_components/clickable'
import { KIND_BAR, KIND_LABEL, paymentState, type AdminBooking, type CalItem, type ItemKind } from '../_components/model'
import { Badge, Card, Empty, PageHeader, Stat } from '../_components/ui'
import { loadOccupancy, nightsBreakdown, toAdminBooking } from '../_lib/queries'
import type { Booking } from '@/lib/types'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Hoy' }

function who(it: CalItem, bookings: Record<string, AdminBooking>) {
  if (it.bookingId && bookings[it.bookingId]) {
    const b = bookings[it.bookingId]
    return { name: `${b.guest_first_name} ${b.guest_last_name !== '-' ? b.guest_last_name : ''}`.trim(), booking: b }
  }
  if (it.kind === 'block') return { name: `Bloqueo: ${it.label}`, booking: undefined }
  if (it.kind === 'closed') return { name: it.label, booking: undefined }
  return { name: `Reserva de ${KIND_LABEL[it.kind]}`, booking: undefined }
}

export default async function TodayPage() {
  const today = todayInChile()
  const month = startOfMonth(today)
  const monthEnd = addMonths(month, 1)
  const horizon = addDays(today, 8)
  const from = month < addDays(today, -1) ? month : addDays(today, -1)
  const to = monthEnd > horizon ? monthEnd : horizon

  const db = supabaseAdmin()
  const [{ items, bookings }, cabinsRes, feedsRes, alertsRes, revenueRes, upcomingRes] = await Promise.all([
    loadOccupancy(from, to),
    db.from('cabins').select('id, name').eq('active', true).order('sort_order'),
    db.from('channel_feeds').select('channel, last_synced_at, last_status'),
    db.from('bookings').select('id', { count: 'exact', head: true }).not('admin_alert', 'is', null),
    db.from('bookings').select('total, amount_paid, nights, source').eq('status', 'confirmed').gte('check_in', month).lt('check_in', monthEnd),
    db.from('bookings').select('*, cabins(name)').eq('status', 'confirmed').gte('check_out', today).order('check_in').limit(200),
  ])
  const cabins = cabinsRes.data ?? []
  const cabinName = Object.fromEntries(cabins.map((c) => [c.id, c.name]))
  const byId = Object.fromEntries(bookings.map((b) => [b.id, b]))
  const real = items.filter((i) => i.kind !== 'block' && i.kind !== 'closed')

  const arrivals = real.filter((i) => i.start === today)
  const departures = real.filter((i) => i.end === today)
  const tonightOf = (c: { id: string }, list: CalItem[]) => list.find((i) => i.cabinId === c.id && i.start <= today && i.end > today)
  const tonight = cabins.map((c) => ({ cabin: c, item: tonightOf(c, real) ?? tonightOf(c, items.filter((i) => i.kind === 'block')), closed: tonightOf(c, items.filter((i) => i.kind === 'closed')) }))

  // Próximos 7 días
  const agenda = Array.from({ length: 7 }, (_, k) => {
    const d = addDays(today, k + 1)
    return { d, in: real.filter((i) => i.start === d), out: real.filter((i) => i.end === d) }
  }).filter((x) => x.in.length || x.out.length)

  // Cobros pendientes: reservas propias confirmadas con saldo, y reservas web esperando pago
  const toCollect = ((upcomingRes.data ?? []) as (Booking & { cabins: { name: string } | null })[])
    .map(toAdminBooking)
    .filter((b) => b.amount_paid < b.total)
  const waiting = bookings.filter((b) => b.status === 'pending')

  // Indicadores del mes
  const monthItems = items.filter((i) => i.start < monthEnd && i.end > month)
  const nb = nightsBreakdown(monthItems, month, monthEnd)
  const capacity = diffDays(month, monthEnd) * Math.max(1, cabins.length)
  const occupancy = Math.round((nb.sold / capacity) * 100)
  const rev = (revenueRes.data ?? []) as { total: number; amount_paid: number; nights: number; source: string }[]
  const revenue = rev.reduce((s, r) => s + r.total, 0)
  const ownNights = rev.reduce((s, r) => s + r.nights, 0)
  const adr = ownNights ? Math.round(revenue / ownNights) : 0
  const directShare = nb.sold ? Math.round((((nb.byKind.direct ?? 0) + (nb.byKind.manual ?? 0)) / nb.sold) * 100) : 0

  const feeds = feedsRes.data ?? []
  const lastSync = feeds.map((f) => f.last_synced_at).filter(Boolean).sort().pop()
  const feedErrors = feeds.filter((f) => f.last_status && f.last_status !== 'ok').length

  const Row = ({ it, tag }: { it: CalItem; tag: string }) => {
    const w = who(it, byId)
    return (
      <li>
        <OpenDetail booking={w.booking} item={w.booking ? undefined : it} cabinName={cabinName[it.cabinId]} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
          <span aria-hidden="true" className={`h-8 w-1.5 shrink-0 rounded-full ${KIND_BAR[it.kind]}`} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold">{w.name}</span>
            <span className="block truncate text-xs text-muted">
              {cabinName[it.cabinId]} · {tag}
              {w.booking?.arrival_window && tag === 'llega' ? ` · ${w.booking.arrival_window}` : ''}
              {w.booking ? ` · ${w.booking.guests} pers.` : ''}
            </span>
          </span>
          {w.booking && w.booking.amount_paid < w.booking.total && <Badge tone="amber">Saldo {formatCLP(w.booking.total - w.booking.amount_paid)}</Badge>}
        </OpenDetail>
      </li>
    )
  }

  return (
    <>
      <PageHeader
        title="Hoy"
        subtitle={<span className="capitalize">{formatDateFull(today)}</span>}
        actions={<QuickActions />}
      />

      {((alertsRes.count ?? 0) > 0 || feedErrors > 0 || waiting.length > 0) && (
        <div className="mb-6 flex flex-col gap-2">
          {(alertsRes.count ?? 0) > 0 && (
            <Link href="/admin/reservas?filtro=alertas" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
              ⚠ {alertsRes.count} reserva(s) necesitan tu atención (por ejemplo, un pago que llegó tarde) →
            </Link>
          )}
          {feedErrors > 0 && (
            <Link href="/admin/canales" className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 text-sm text-amber-light">
              ⚠ {feedErrors} calendario(s) de Booking/Airbnb no se pudieron leer en la última sincronización →
            </Link>
          )}
          {waiting.length > 0 && (
            <p className="rounded-xl border border-cream/10 bg-surface px-4 py-3 text-sm text-sub">
              {waiting.length} huésped(es) están pagando en la web ahora mismo; sus fechas quedan apartadas unos minutos.
            </p>
          )}
        </div>
      )}

      {/* Esta noche */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {tonight.map(({ cabin, item, closed }) => {
          const w = item ? who(item, byId) : null
          return (
            <div key={cabin.id} className="flex items-center gap-4 rounded-2xl border border-cream/[0.06] bg-surface p-4">
              <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${item ? KIND_BAR[item.kind] : 'bg-[#1F3A2A] text-[#A7E3BC]'}`}>
                {cabin.name.replace(/^Caba(ñ|n)a\s*/i, '')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-[1.2px] text-muted">{cabin.name} · esta noche</p>
                {item && w ? (
                  <OpenDetail booking={w.booking} item={w.booking ? undefined : item} cabinName={cabin.name} className="-mx-1 mt-0.5 rounded-lg px-1">
                    <span className="block truncate text-base font-semibold">{w.name}</span>
                    <span className="block text-xs text-muted">hasta {formatDate(item.end)} · {KIND_LABEL[item.kind]}</span>
                  </OpenDetail>
                ) : (
                  <>
                    <p className="mt-0.5 text-base font-semibold text-[#A7E3BC]">Libre</p>
                    {closed && (
                      <OpenDetail item={closed} cabinName={cabin.name} className="-mx-1 rounded-lg px-1 text-xs text-muted">
                        {closed.label} hasta {formatDate(closed.end)} · revisar
                      </OpenDetail>
                    )}
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card title={`Llegan hoy (${arrivals.length})`} pad={false}>
          <ul className="p-2">{arrivals.length ? arrivals.map((it) => <Row key={it.key} it={it} tag="llega" />) : <Empty>Nadie llega hoy.</Empty>}</ul>
        </Card>
        <Card title={`Se van hoy (${departures.length})`} pad={false}>
          <ul className="p-2">{departures.length ? departures.map((it) => <Row key={it.key} it={it} tag="sale" />) : <Empty>Nadie se va hoy.</Empty>}</ul>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Próximos 7 días" action={<Link href="/admin/calendario" className="fx-link text-[13px] text-amber">Ver calendario</Link>} pad={false}>
          {agenda.length ? (
            <ol className="divide-y divide-cream/[0.05]">
              {agenda.map((day) => (
                <li key={day.d} className="px-2 py-2">
                  <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-[1.2px] text-muted">{formatDate(day.d)}</p>
                  <ul>
                    {day.in.map((it) => <Row key={'i' + it.key} it={it} tag="llega" />)}
                    {day.out.map((it) => <Row key={'o' + it.key} it={it} tag="sale" />)}
                  </ul>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Sin llegadas ni salidas en los próximos 7 días.</Empty>
          )}
        </Card>

        <Card title={`Por cobrar (${toCollect.length})`} pad={false}>
          {toCollect.length ? (
            <ul className="p-2">
              {toCollect.slice(0, 8).map((b) => {
                const p = paymentState(b)
                return (
                  <li key={b.id}>
                    <OpenDetail booking={b} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold">{b.guest_first_name} {b.guest_last_name !== '-' ? b.guest_last_name : ''}</span>
                        <span className="block truncate text-xs text-muted">{b.cabin_name} · llega {formatDate(b.check_in)}</span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-bold tabular-nums text-amber-light">{formatCLP(b.total - b.amount_paid)}</span>
                        <Badge tone={p.tone}>{p.label}</Badge>
                      </span>
                    </OpenDetail>
                  </li>
                )
              })}
            </ul>
          ) : (
            <Empty>Todo cobrado 🎉</Empty>
          )}
        </Card>
      </div>

      <h2 className="mb-3 text-[15px] font-semibold capitalize">{formatMonth(month)} en números</h2>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Ocupación" value={`${occupancy}%`} hint={`${nb.sold} de ${capacity} noches`} tone="amber" />
        <Stat label="Ingresos directos" value={formatCLP(revenue)} hint="Reservas web y manuales que llegan este mes" />
        <Stat label="Tarifa promedio" value={adr ? formatCLP(adr) : '—'} hint="Por noche, reservas directas" />
        <Stat label="Reservas directas" value={`${directShare}%`} hint="Del total de noches vendidas" tone={directShare >= 50 ? 'green' : undefined} />
      </div>
      <Card title="Noches vendidas por canal">
        {nb.sold ? (
          <div className="flex flex-col gap-3">
            <div className="flex h-3 overflow-hidden rounded-full bg-surface-2">
              {(['direct', 'manual', 'booking', 'airbnb'] as ItemKind[]).map((k) =>
                nb.byKind[k] ? <span key={k} className={KIND_BAR[k]} style={{ width: `${(nb.byKind[k] / nb.sold) * 100}%` }} /> : null,
              )}
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-sub">
              {(['direct', 'manual', 'booking', 'airbnb', 'block'] as ItemKind[]).map((k) => (
                <span key={k} className="flex items-center gap-2">
                  <span aria-hidden="true" className={`h-3 w-3 rounded ${KIND_BAR[k]}`} />
                  {KIND_LABEL[k]}: <strong className="text-cream">{nb.byKind[k] ?? 0}</strong>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <Empty>Aún no hay noches vendidas este mes.</Empty>
        )}
        <p className="mt-4 text-xs text-muted">
          {feeds.length
            ? `Booking/Airbnb sincronizados ${lastSync ? new Date(lastSync).toLocaleString('es-CL', { timeZone: 'America/Santiago', dateStyle: 'short', timeStyle: 'short' }) : 'nunca'}.`
            : 'Booking y Airbnb aún no están conectados.'}{' '}
          <Link href="/admin/canales" className="text-amber underline underline-offset-2">Canales</Link>
        </p>
      </Card>
    </>
  )
}
