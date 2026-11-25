'use client'

import { useState } from 'react'
import { DatePicker } from '@/components/date-picker'
import { addDays, diffDays, formatDate, todayInChile } from '@/lib/dates'
import { deleteBlockAction, openDatesAction } from '../actions'
import { useAdmin } from './admin-provider'
import { Drawer } from './drawer'
import { CHANNEL_NAME, KIND_LABEL, type CalItem } from './model'
import { cls } from './ui'

const CHANNEL_LINK: Record<string, string> = {
  booking: 'https://admin.booking.com',
  airbnb: 'https://www.airbnb.cl/hosting/reservations',
}

/** Formulario para abrir (liberar) noches de un bloqueo o de un cierre de Booking/Airbnb. */
function OpenDatesForm({ item, warn, onDone }: { item: CalItem; warn?: string; onDone: () => void }) {
  const { run } = useAdmin()
  const today = todayInChile()
  const first0 = item.start < today ? today : item.start
  const [first, setFirst] = useState(first0)
  const [last, setLast] = useState(addDays(item.end, -1))
  const [busy, setBusy] = useState(false)
  const nights = first && last && last >= first ? diffDays(first, last) + 1 : 0

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-cream/10 p-4">
      <h3 className="text-sm font-semibold">Abrir fechas</h3>
      <p className="text-[13px] leading-relaxed text-muted">
        Las noches que abras quedan disponibles en la web y se informan libres a Booking y Airbnb. Si después aparece una reserva nueva en esas fechas, se respeta.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className={cls.label}>
          <span aria-hidden="true">Primera noche</span>
          <DatePicker aria-label="Primera noche" value={first} min={first0} onChange={setFirst} className={`${cls.input} flex items-center`} />
        </div>
        <div className={cls.label}>
          <span aria-hidden="true">Última noche</span>
          <DatePicker aria-label="Última noche" value={last} min={first} openTo={first} onChange={setLast} className={`${cls.input} flex items-center`} />
        </div>
      </div>
      {warn && <p className="rounded-xl border border-amber/30 bg-amber/10 px-3.5 py-2.5 text-[13px] text-amber-light">{warn}</p>}
      <button
        type="button"
        disabled={busy || !nights}
        onClick={async () => {
          if (warn && !window.confirm('¿Seguro que no es una reserva real? Si la abres, otra persona podría reservar esas noches.')) return
          setBusy(true)
          const r = await run(() => openDatesAction(item.cabinId, first, last))
          setBusy(false)
          if (r.ok) onDone()
        }}
        className={`${cls.btnSm} self-start`}
      >
        Abrir {nights ? `${nights} ${nights === 1 ? 'noche' : 'noches'}` : 'fechas'}
      </button>
    </section>
  )
}

/** Detalle de un bloqueo, de un cierre o de una reserva importada de Booking/Airbnb. */
export function ItemDetail({ item, cabinName, onClose }: { item: CalItem; cabinName: string; onClose: () => void }) {
  const { run } = useAdmin()
  const [busy, setBusy] = useState(false)
  const [showOpen, setShowOpen] = useState(false)
  const nights = diffDays(item.start, item.end)
  const isBlock = item.kind === 'block'
  const isClosed = item.kind === 'closed'
  const channel = item.channel ? CHANNEL_NAME[item.channel] : KIND_LABEL[item.kind]
  const nightLabels = isBlock || isClosed
  const title = isBlock ? 'Fechas bloqueadas' : isClosed ? `Cerrado en ${channel}` : `Reserva de ${channel}`

  return (
    <Drawer open onClose={onClose} title={title} subtitle={cabinName} width={460}>
      <div className="flex flex-col gap-5">
        <section className="grid grid-cols-2 gap-3 rounded-2xl bg-ink p-4 text-sm">
          <div><p className="text-xs text-muted">{nightLabels ? 'Primera noche' : 'Llegada'}</p><p className="mt-0.5 font-semibold">{formatDate(item.start)}</p></div>
          <div><p className="text-xs text-muted">{nightLabels ? 'Última noche' : 'Salida'}</p><p className="mt-0.5 font-semibold">{formatDate(nightLabels ? addDays(item.end, -1) : item.end)}</p></div>
          <div><p className="text-xs text-muted">Noches</p><p className="mt-0.5 font-semibold">{nights}</p></div>
          {isBlock && <div><p className="text-xs text-muted">Motivo</p><p className="mt-0.5 font-semibold">{item.reason}</p></div>}
        </section>

        {isBlock && (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                if (!item.blockId || !window.confirm('¿Quitar todo este bloqueo? Las fechas quedarán disponibles para reservar.')) return
                setBusy(true)
                const r = await run(() => deleteBlockAction(item.blockId!))
                setBusy(false)
                if (r.ok) onClose()
              }}
              className={`${cls.danger} self-start`}
            >
              Quitar todo el bloqueo
            </button>
            <OpenDatesForm item={item} onDone={onClose} />
          </>
        )}

        {isClosed && (
          <>
            <p className="text-sm leading-relaxed text-sub">
              {channel} tiene estas noches <strong className="text-cream">cerradas</strong>, pero no es una reserva. Puede ser que no hayas abierto esas fechas allá
              {item.channel === 'booking' ? ' (por ejemplo, "habitaciones a la venta" en 0)' : ''}, o que las bloqueaste en {channel}.
            </p>
            <p className="text-sm leading-relaxed text-sub">
              Lo ideal es abrirlas en {channel}. Si no quieres esperar, ábrelas aquí y la web y el otro canal las verán libres.
            </p>
            <a href={CHANNEL_LINK[item.channel ?? 'booking']} target="_blank" rel="noreferrer" className={`${cls.ghostSm} self-start`}>Ir a {channel} ↗</a>
            <OpenDatesForm item={item} onDone={onClose} />
          </>
        )}

        {!isBlock && !isClosed && (
          <>
            <p className="text-sm leading-relaxed text-sub">
              Esta reserva viene del calendario de {channel}. Los datos del huésped y el pago se ven allá; aquí solo bloquea las fechas para que nadie más reserve.
            </p>
            <a href={CHANNEL_LINK[item.channel ?? item.kind]} target="_blank" rel="noreferrer" className={`${cls.btnSm} self-start`}>Abrir {channel} ↗</a>
            {item.channel === 'booking' &&
              (showOpen ? (
                <OpenDatesForm
                  item={item}
                  onDone={onClose}
                  warn="Booking no distingue reservas de fechas cerradas. Abre estas noches solo si confirmaste en el extranet que NO hay una reserva."
                />
              ) : (
                <button type="button" onClick={() => setShowOpen(true)} className="self-start text-[13px] text-muted underline underline-offset-2 hover:text-cream">
                  ¿No es una reserva? Abrir estas fechas
                </button>
              ))}
          </>
        )}
      </div>
    </Drawer>
  )
}
