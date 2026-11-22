import type { Metadata } from 'next'
import { RatingBadges } from '@/components/listings'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookingWidget } from '@/components/booking-widget'
import { AmenityIcon } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { SiteHeader } from '@/components/site-header'
import { getBusyRanges, getCabin, getRates } from '@/lib/data'
import { addMonths, isISODate, todayInChile } from '@/lib/dates'
import { getSettings, orConsult } from '@/lib/settings'
import { checkInText } from '@/lib/settings-format'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/cabanas/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const cabin = await getCabin(slug)
  return cabin ? { title: cabin.name, description: cabin.short_description } : {}
}

export default async function CabinPage(props: PageProps<'/cabanas/[slug]'>) {
  const { slug } = await props.params
  const sp = await props.searchParams
  const cabin = await getCabin(slug)
  if (!cabin) notFound()

  const today = todayInChile()
  const [busy, rates, settings] = await Promise.all([
    getBusyRanges(cabin.id, today, addMonths(today, 13)),
    getRates({ cabinId: cabin.id, from: today }),
    getSettings(),
  ])
  const llegada = typeof sp.llegada === 'string' && isISODate(sp.llegada) ? sp.llegada : undefined
  const salida = typeof sp.salida === 'string' && isISODate(sp.salida) ? sp.salida : undefined
  const huespedes = typeof sp.huespedes === 'string' ? Number(sp.huespedes) || undefined : undefined

  const gallery = cabin.gallery.length ? cabin.gallery : [cabin.cover_image]
  const [main, ...rest] = gallery

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1440px] px-5 pb-32 pt-9 md:px-[5%]">
        <p className="mb-4 text-[13px] text-muted">
          <Link href="/#cabanas" className="fx-link">Cabañas</Link> / {cabin.name}
        </p>
        <div className="mb-7 flex flex-wrap items-end justify-between gap-5">
          <div>
            <h1 className="fx-up font-display text-[clamp(48px,5vw,76px)] font-medium leading-none">{cabin.name}</h1>
            <p className="fx-up fx-d1 mt-3 text-base text-sub">
              Hasta {cabin.capacity} huéspedes · {cabin.bedrooms_summary} · terraza privada
            </p>
            <RatingBadges className="fx-up fx-d2 mt-4" />
          </div>
        </div>

        <div className="fx-up fx-d1 grid auto-rows-[160px] grid-cols-2 gap-3 md:auto-rows-[250px] md:grid-cols-4">
          <div className="relative col-span-2 row-span-2 overflow-hidden rounded-[10px] md:rounded-r-none">
            <Image src={main} alt={`${cabin.name}: foto principal`} fill priority sizes="(max-width: 768px) 100vw, 50vw" className="fx-pop object-cover" />
          </div>
          {rest.slice(0, 4).map((src, i) => (
            <div
              key={src + i}
              className={`relative overflow-hidden ${i === 1 ? 'md:rounded-tr-[10px]' : ''} ${i === 3 ? 'md:rounded-br-[10px]' : ''} rounded-md md:rounded-none`}
            >
              <Image src={src} alt={`${cabin.name}: foto ${i + 2}`} fill sizes="(max-width: 768px) 50vw, 25vw" className="fx-pop object-cover" />
            </div>
          ))}
        </div>

        <div className="mt-16">
          <BookingWidget
            rates={rates}
            cabin={{
              id: cabin.id,
              slug: cabin.slug,
              name: cabin.name,
              price_per_night: cabin.price_per_night,
              cleaning_fee: cabin.cleaning_fee,
              min_nights: cabin.min_nights,
              capacity: cabin.capacity,
            }}
            today={today}
            busy={busy.map(({ start, end }) => ({ start, end }))}
            initialCheckIn={llegada}
            initialCheckOut={salida}
            initialGuests={huespedes}
            before={
              <>
                <Reveal as="section">
                  <h2 className="mb-4 font-display text-[42px] font-medium">Sobre la cabaña</h2>
                  <p className="max-w-[680px] whitespace-pre-line text-[17px] leading-[1.75] text-sub">{cabin.description}</p>
                </Reveal>
                {cabin.amenities.length > 0 && (
                  <Reveal as="section">
                    <h2 className="mb-6 font-display text-[42px] font-medium">Qué ofrece</h2>
                    <ul className="grid grid-cols-1 gap-x-10 gap-y-5 text-base sm:grid-cols-2">
                      {cabin.amenities.map((a) => (
                        <li key={a} className="flex items-center gap-3.5">
                          <AmenityIcon label={a} className="shrink-0 text-amber" />
                          {a}
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}
              </>
            }
            after={
              <Reveal as="section">
                <h2 className="mb-5 font-display text-[42px] font-medium">Bueno saber</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-4">
                  {[
                    ['Check-in', checkInText(settings) || 'Consúltanos'],
                    ['Check-out', settings.check_out_until ? `Hasta las ${settings.check_out_until}` : 'Consúltanos'],
                    ['Cancelación', orConsult(settings.cancellation_policy)],
                    ['Mascotas', orConsult(settings.pets_policy)],
                  ].map(([k, v]) => (
                    <div key={k} className="fx-tile rounded-[10px] bg-surface p-5">
                      <p className="text-xs uppercase tracking-[2px] text-muted">{k}</p>
                      <p className="mt-2 whitespace-pre-line text-lg font-semibold">{v}</p>
                    </div>
                  ))}
                </div>
              </Reveal>
            }
          />
        </div>
      </main>
    </>
  )
}
