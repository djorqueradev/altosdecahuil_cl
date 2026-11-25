'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { IconChevronLeft, IconChevronRight, IconClose } from '@/components/icons'
import { addDays, addMonths, diffDays, formatDate, formatMonth, startOfMonth, weekdayMondayFirst } from '@/lib/dates'
import { formatCLP } from '@/lib/money'
import { nightPrice, type Rate } from '@/lib/pricing'
import { openDatesAction } from '../actions'
import { useAdmin } from './admin-provider'
import { KIND_BAR, KIND_LABEL, type AdminBooking, type CabinLite, type CalItem, type ItemKind } from './model'
import { cls } from './ui'

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

type Props = {
  month: string // YYYY-MM-01
  today: string
  view: string // 'todas' | slug de cabaña
  items: CalItem[]
  bookings: AdminBooking[]
  rates: Rate[]
}

type Sel = { cabinId: string; a: string; b?: string }

const shortName = (n: string) => n.replace(/^Caba(ñ|n)a\s*/i, 'C')

export function MonthCalendar({ month, today, view, items, bookings, rates }: Props) {
  const { cabins, openBooking, openItem, openNewBooking, openBlock, run } = useAdmin()
  const [sel, setSel] = useState<Sel | null>(null)
  const [hidden, setHidden] = useState<ItemKind[]>([])

  const single = view !== 'todas'
  const lanes: CabinLite[] = single ? cabins.filter((c) => c.slug === view) : cabins
  const bookingById = useMemo(() => Object.fromEntries(bookings.map((b) => [b.id, b])), [bookings])

  const weeks = useMemo(() => {
    const first = month
    const gridStart = addDays(first, -weekdayMondayFirst(first))
    const last = addDays(addMonths(first, 1), -1)
    const gridEnd = addDays(last, 6 - weekdayMondayFirst(last))
    const out: string[][] = []
    for (let d = gridStart; d <= gridEnd; d = addDays(d, 7)) out.push(Array.from({ length: 7 }, (_, i) => addDays(d, i)))
    return out
  }, [month])

  const visibleItems = items.filter((i) => !hidden.includes(i.kind))
  const inMonth = (d: string) => d.slice(0, 7) === month.slice(0, 7)
  const qs = (m: string, v: string) => `/admin/calendario?mes=${m.slice(0, 7)}&vista=${v}`

  function clickDay(cabinId: string, d: string) {
    if (d < today) return
    setSel((s) => {
      if (!s || s.cabinId !== cabinId || s.b) return { cabinId, a: d }
      if (d < s.a) return { cabinId, a: d }
      return { ...s, b: d }
    })
  }
  const selFirst = sel?.a
  const selLast = sel ? sel.b ?? sel.a : undefined
  const selNights = sel ? diffDays(sel.a, selLast!) + 1 : 0
  const selCabin = sel ? cabins.find((c) => c.id === sel.cabinId) : undefined
  const selEnd = selLast ? addDays(selLast, 1) : undefined
  const selClosed = !!sel && items.some((it) => it.cabinId === sel.cabinId && (it.kind === 'block' || it.kind === 'closed') && it.start < selEnd! && it.end > selFirst!)

  // Ocupación del mes por cabaña
  const monthEnd = addMonths(month, 1)
  const monthDays = diffDays(month, monthEnd)
  const occ = lanes.map((c) => {
    let n = 0
    for (const it of items) {
      if (it.cabinId !== c.id || it.kind === 'pending' || it.kind === 'block' || it.kind === 'closed') continue
      const s = it.start > month ? it.start : month
      const e = it.end < monthEnd ? it.end : monthEnd
      n += Math.max(0, diffDays(s, e))
    }
    return { cabin: c, nights: n, pct: Math.round((n / monthDays) * 100) }
  })

  return (
    <div className="flex flex-col gap-4">
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href={qs(addMonths(month, -1), view)} aria-label="Mes anterior" className={`${cls.ghost} w-10 px-0`}><IconChevronLeft size={16} strokeWidth={2.2} /></Link>
          <h2 className="min-w-[170px] text-center text-lg font-semibold">{formatMonth(month)}</h2>
          <Link href={qs(addMonths(month, 1), view)} aria-label="Mes siguiente" className={`${cls.ghost} w-10 px-0`}><IconChevronRight size={16} strokeWidth={2.2} /></Link>
          {month !== startOfMonth(today) && <Link href={qs(startOfMonth(today), view)} className={cls.ghost}>Hoy</Link>}
        </div>
        <div role="tablist" aria-label="Vista" className="flex gap-1 rounded-xl bg-surface p-1">
          {[{ v: 'todas', label: 'Ambas cabañas' }, ...cabins.map((c) => ({ v: c.slug, label: c.name }))].map((o) => (
            <Link
              key={o.v}
              href={qs(month, o.v)}
              role="tab"
              aria-selected={view === o.v}
              className={`flex min-h-9 items-center rounded-[9px] px-3.5 text-[13px] font-semibold transition-colors ${view === o.v ? 'bg-amber text-amber-ink' : 'text-sub hover:bg-surface-2 hover:text-cream'}`}
            >
              {o.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Ocupación del mes */}
      <div className="flex flex-wrap gap-2">
        {occ.map((o) => (
          <div key={o.cabin.id} className="flex items-center gap-3 rounded-xl bg-surface px-3.5 py-2 text-[13px]">
            <span className="font-semibold">{o.cabin.name}</span>
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-amber" style={{ width: `${Math.min(100, o.pct)}%` }} /></span>
            <span className="tabular-nums text-sub">{o.pct}% · {o.nights} noches</span>
          </div>
        ))}
      </div>

      {/* Calendario */}
      <div className="overflow-hidden rounded-2xl border border-cream/[0.06] bg-surface">
        <div className={`grid border-b border-cream/[0.06] bg-[#191613] ${single ? 'grid-cols-7' : 'grid-cols-[36px_repeat(7,minmax(0,1fr))] md:grid-cols-[52px_repeat(7,minmax(0,1fr))]'}`}>
          {!single && <span />}
          {WEEKDAYS.map((w, i) => (
            <span key={w} className={`py-2.5 text-center text-[11px] font-semibold uppercase tracking-[1px] ${i >= 5 ? 'text-amber/80' : 'text-muted'}`}>{w}</span>
          ))}
        </div>

        {weeks.map((week) => {
          const ws = week[0]
          const we = addDays(ws, 7)
          return (
            <div key={ws} className="border-b border-cream/[0.06] last:border-b-0">
              {/* Números de día */}
              <div className={`grid ${single ? 'grid-cols-7' : 'grid-cols-[36px_repeat(7,minmax(0,1fr))] md:grid-cols-[52px_repeat(7,minmax(0,1fr))]'}`}>
                {!single && <span />}
                {week.map((d) => (
                  <div key={d} className={`flex h-8 items-center justify-between px-2 ${inMonth(d) ? '' : 'opacity-35'}`}>
                    <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1 text-[12px] font-semibold tabular-nums ${d === today ? 'bg-amber text-amber-ink' : d < today ? 'text-muted' : 'text-cream'}`}>
                      {Number(d.slice(8))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Un carril por cabaña */}
              {lanes.map((c) => {
                const laneItems = visibleItems
                  .filter((it) => it.cabinId === c.id && it.start < we && it.end >= ws)
                  .sort((x, y) => (x.start < y.start ? -1 : 1))
                const rowsEnd: number[] = []
                const placed = laneItems.map((it) => {
                  const s = it.start < ws ? 1 : 2 * diffDays(ws, it.start) + 2
                  const e = it.end >= we ? 15 : 2 * diffDays(ws, it.end) + 2
                  let row = rowsEnd.findIndex((end) => end <= s)
                  if (row === -1) {
                    row = rowsEnd.length
                    rowsEnd.push(e)
                  } else rowsEnd[row] = e
                  return { it, s, e, row, contL: it.start < ws, contR: it.end >= we }
                })
                const rows = Math.max(1, rowsEnd.length)
                return (
                  <div key={c.id} className={`grid ${single ? 'grid-cols-1' : 'grid-cols-[36px_minmax(0,1fr)] md:grid-cols-[52px_minmax(0,1fr)]'} ${!single && c !== lanes[lanes.length - 1] ? '' : 'pb-1'}`}>
                    {!single && (
                      <span title={c.name} className="flex items-center justify-center border-r border-cream/[0.04] text-[10px] font-bold uppercase tracking-[0.5px] text-muted md:text-[11px]">
                        {shortName(c.name)}
                      </span>
                    )}
                    <div
                      className="relative grid"
                      style={{
                        gridTemplateColumns: 'repeat(14, minmax(0, 1fr))',
                        gridTemplateRows: single ? `repeat(${rows}, 32px) minmax(44px, 1fr)` : `repeat(${rows}, 30px)`,
                        minHeight: single ? 96 : 34,
                      }}
                    >
                      {/* Fondo: un botón por día (seleccionar noches) */}
                      {week.map((d, i) => {
                        const selected = sel && sel.cabinId === c.id && d >= selFirst! && d <= selLast!
                        const occupied = laneItems.some((it) => it.kind !== 'pending' && d >= it.start && d < it.end)
                        const price = single && !occupied ? nightPrice(c, d, rates) : 0
                        const past = d < today
                        return (
                          <button
                            key={d}
                            type="button"
                            disabled={past}
                            onClick={() => clickDay(c.id, d)}
                            aria-label={`${c.name}, ${formatDate(d)}${price ? `, ${formatCLP(price)}` : ''}`}
                            aria-pressed={!!selected}
                            className={`relative border-r border-cream/[0.04] transition-colors last:border-r-0 ${past ? 'cursor-default bg-black/15' : 'hover:bg-cream/[0.04]'} ${selected ? '!bg-amber/20 ring-1 ring-inset ring-amber/60' : ''} ${inMonth(d) ? '' : 'opacity-50'}`}
                            style={{ gridColumn: `${2 * i + 1} / span 2`, gridRow: '1 / -1' }}
                          >
                            {single && price > 0 && !past && (
                              <span className="absolute bottom-1.5 right-2 text-[11px] font-medium tabular-nums text-muted">{formatCLP(price).replace('$', '$ ')}</span>
                            )}
                          </button>
                        )
                      })}
                      {/* Barras */}
                      {placed.map(({ it, s, e, row, contL, contR }) => {
                        const past = it.end <= today
                        return (
                          <button
                            key={it.key + ws}
                            type="button"
                            onClick={() => (it.bookingId && bookingById[it.bookingId] ? openBooking(bookingById[it.bookingId]) : openItem(it, c.name))}
                            title={`${it.label} · ${KIND_LABEL[it.kind]} · ${formatDate(it.start)} → ${formatDate(it.end)}`}
                            className={`fx-bar relative z-10 my-[3px] flex min-w-0 items-center overflow-hidden px-2 text-left text-[12px] font-semibold leading-none ${KIND_BAR[it.kind]} ${contL ? 'rounded-l-none' : 'rounded-l-lg'} ${contR ? 'rounded-r-none' : 'rounded-r-lg'} ${past ? 'opacity-55' : ''}`}
                            style={{ gridColumn: `${s} / ${e}`, gridRow: row + 1 }}
                          >
                            <span className="truncate">{e - s >= 2 ? it.label : ''}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Leyenda / filtros */}
      <div className="flex flex-wrap items-center gap-2 text-[12px]">
        <span className="mr-1 text-muted">Mostrar:</span>
        {(Object.keys(KIND_LABEL) as ItemKind[]).map((k) => {
          const off = hidden.includes(k)
          return (
            <button
              key={k}
              type="button"
              aria-pressed={!off}
              onClick={() => setHidden((h) => (off ? h.filter((x) => x !== k) : [...h, k]))}
              className={`flex min-h-8 items-center gap-2 rounded-full border px-3 font-semibold transition-opacity ${off ? 'border-cream/10 opacity-45' : 'border-cream/15'}`}
            >
              <span aria-hidden="true" className={`h-3 w-3 rounded ${KIND_BAR[k]}`} />
              {KIND_LABEL[k]}
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted">Toca un día para empezar a seleccionar noches y luego el último día: podrás crear una reserva, bloquear o abrir fechas cerradas. Toca una barra para ver el detalle.</p>

      {/* Barra de acción de la selección */}
      {sel && selCabin && (
        <div className="fixed inset-x-3 bottom-[76px] z-50 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-[620px] md:-translate-x-1/2">
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber/30 bg-[#211C17] p-3 pl-4 shadow-[0_20px_50px_rgba(0,0,0,.55)] [animation:toast-in_.25s_ease_both]">
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-semibold">{selCabin.name} · {selNights} {selNights === 1 ? 'noche' : 'noches'}</p>
              <p className="truncate text-xs text-muted">
                {formatDate(selFirst!)} → salida {formatDate(addDays(selLast!, 1))}
                {!sel.b && ' · toca el último día para extender'}
              </p>
            </div>
            <button type="button" onClick={() => { openNewBooking({ cabinId: sel.cabinId, checkIn: selFirst, checkOut: addDays(selLast!, 1) }); setSel(null) }} className={cls.btnSm}>Nueva reserva</button>
            <button type="button" onClick={() => { openBlock({ cabinId: sel.cabinId, firstNight: selFirst, lastNight: selLast }); setSel(null) }} className={cls.ghostSm}>Bloquear</button>
            {selClosed && (
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm(`¿Abrir ${selNights} ${selNights === 1 ? 'noche' : 'noches'} en ${selCabin.name}? Quedarán disponibles en la web, Booking y Airbnb.`)) return
                  const r = await run(() => openDatesAction(sel.cabinId, selFirst!, selLast!))
                  if (r.ok) setSel(null)
                }}
                className={cls.ghostSm}
              >
                Abrir fechas
              </button>
            )}
            <button type="button" aria-label="Quitar selección" onClick={() => setSel(null)} className="flex h-8 w-8 items-center justify-center rounded-full text-muted hover:bg-surface-2 hover:text-cream"><IconClose size={16} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
