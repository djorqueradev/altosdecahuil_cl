import Image from 'next/image'
import { ReviewsSection } from '@/components/listings'
import Link from 'next/link'
import { CabinPrice } from '@/components/cabin-price'
import { IconCar, IconDeck, IconFire, IconKitchen } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { SearchBar } from '@/components/search-bar'
import { SiteHeader } from '@/components/site-header'
import { getCabins } from '@/lib/data'
import { todayInChile } from '@/lib/dates'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'

const eyebrow = 'mb-5 text-[13px] font-semibold uppercase tracking-[5px] text-amber'
const h2 = 'font-display text-[44px] font-medium leading-[1.02] md:text-[64px]'

export default async function HomePage() {
  const cabins = await getCabins()
  const maxGuests = Math.max(2, ...cabins.map((c) => c.capacity))

  return (
    <main>
      {/* HERO */}
      <section className="relative flex min-h-[760px] flex-col overflow-hidden md:min-h-[900px]">
        <Image
          src="/fotos/hero_lobos.jpg"
          alt="Atardecer frente a los roqueríos de Punta de Lobos"
          fill
          priority
          sizes="100vw"
          className="fx-hero-img object-cover object-[center_42%]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(18,16,14,.55)_0%,rgba(18,16,14,.05)_35%,rgba(18,16,14,.15)_60%,rgba(18,16,14,.92)_100%)]"
        />
        <SiteHeader overlay />
        <div className="relative mx-auto mt-auto flex w-full max-w-[1440px] flex-col gap-10 px-5 pb-14 pt-40 md:px-[5%]">
          <div className="max-w-[860px]">
            <p className={`fx-up fx-d1 ${eyebrow} mb-[18px]`}>Cáhuil · pasado Punta de Lobos</p>
            <h1 className="fx-up fx-d2 font-display text-[clamp(54px,7.2vw,104px)] font-medium leading-[0.95] tracking-[-1px]">
              Donde el día
              <br />
              <em className="text-[#F5D2A8]">se despide</em> en el mar.
            </h1>
            <p className="fx-up fx-d3 mt-7 max-w-[560px] text-[19px] leading-relaxed text-sand">
              Dos cabañas de madera en lo alto de la costa de Cáhuil. Terraza, fogón y el Pacífico a pocos minutos.
            </p>
          </div>
          <SearchBar
            className="fx-up fx-d4"
            cabins={cabins.map((c) => ({ slug: c.slug, name: c.name }))}
            today={todayInChile()}
            maxGuests={maxGuests}
          />
        </div>
      </section>

      {/* EXPERIENCIA */}
      <section id="experiencia" className="mx-auto flex max-w-[1440px] scroll-mt-8 flex-wrap items-center gap-16 px-5 pb-28 pt-28 md:px-[5%] md:pt-36">
        <Reveal className="min-w-0 flex-[1_1_420px]">
          <p className={eyebrow}>La experiencia</p>
          <h2 className={h2}>Café en la terraza, fuego al atardecer y silencio de campo costero.</h2>
          <p className="mt-7 max-w-[520px] text-[17px] leading-[1.75] text-sub">
            Cada cabaña tiene cocina equipada, living, dormitorio y su propia terraza elevada. Afuera te espera el fogón con
            parrilla para las noches de verano.
          </p>
          <ul className="mt-12 grid max-w-[520px] grid-cols-2 gap-x-10 gap-y-7 text-[15px]">
            <li className="flex items-center gap-3.5"><IconFire className="text-amber" size={26} />Fogón y parrilla</li>
            <li className="flex items-center gap-3.5"><IconDeck className="text-amber" size={26} />Terraza privada</li>
            <li className="flex items-center gap-3.5"><IconKitchen className="text-amber" size={26} />Cocina equipada</li>
            <li className="flex items-center gap-3.5"><IconCar className="text-amber" size={26} />Estacionamiento</li>
          </ul>
        </Reveal>
        <Reveal delay={150} className="grid min-w-0 flex-[1_1_480px] grid-cols-2 gap-4">
          <div className="relative h-[380px] overflow-hidden rounded-md md:h-[520px]">
            <Image src="/fotos/fire.jpg" alt="Fogón encendido con parrilla" fill sizes="(max-width: 768px) 50vw, 25vw" className="fx-pop object-cover" />
          </div>
          <div className="flex flex-col gap-4 pt-10 md:pt-20">
            <div className="relative h-[200px] overflow-hidden rounded-md md:h-[300px]">
              <Image src="/fotos/breakfast.jpg" alt="Desayuno servido en mesa de madera al aire libre" fill sizes="(max-width: 768px) 50vw, 25vw" className="fx-pop object-cover" />
            </div>
            <div className="relative h-[150px] overflow-hidden rounded-md md:h-[220px]">
              <Image src="/fotos/coffee.jpg" alt="Taza de café en la terraza por la mañana" fill sizes="(max-width: 768px) 50vw, 25vw" className="fx-pop object-cover" />
            </div>
          </div>
        </Reveal>
      </section>

      {/* CABAÑAS */}
      <section id="cabanas" className="mx-auto max-w-[1440px] scroll-mt-8 px-5 pb-36 pt-10 md:px-[5%]">
        <Reveal className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <h2 className={h2}>Nuestras cabañas</h2>
          <p className="max-w-[360px] text-[15px] text-muted">
            Dos cabañas independientes, iguales en comodidad. Reserva una o las dos para venir en grupo.
          </p>
        </Reveal>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,460px),1fr))] gap-8">
          {cabins.map((c, i) => (
            <Reveal key={c.id} delay={i * 120}>
              <Link href={`/cabanas/${c.slug}`} className="fx-card flex h-full flex-col overflow-hidden rounded-[10px] bg-surface">
                <div className="relative h-[320px] overflow-hidden md:h-[420px]">
                  <Image src={c.cover_image} alt={`Exterior de la ${c.name}`} fill sizes="(max-width: 1000px) 100vw, 50vw" className="fx-zoom object-cover" />
                </div>
                <div className="flex flex-col gap-3.5 p-8">
                  <div className="flex flex-wrap items-baseline justify-between gap-4">
                    <h3 className="font-display text-[38px] font-semibold">{c.name}</h3>
                    <CabinPrice price={c.price_per_night} className="text-[15px] text-sub" />
                  </div>
                  <p className="text-[15px] leading-relaxed text-muted">
                    Hasta {c.capacity} huéspedes · {c.bedrooms_summary}
                  </p>
                  <span className="fx-link mt-2 self-start border-b border-amber pb-1 font-semibold text-amber">
                    Ver fechas disponibles →
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* GALERÍA */}
      <section id="galeria" className="mx-auto max-w-[1440px] scroll-mt-8 px-5 pb-36 md:px-[5%]">
        <Reveal as="h2" className={`${h2} mb-10`}>Por dentro</Reveal>
        <Reveal className="grid auto-rows-[180px] grid-cols-2 gap-3.5 md:auto-rows-[260px] md:grid-cols-4">
          {[
            { src: '/fotos/living.jpg', alt: 'Living con sillón y TV', cls: 'col-span-2 row-span-2' },
            { src: '/fotos/bedroom.jpg', alt: 'Dormitorio matrimonial', cls: 'row-span-2' },
            { src: '/fotos/kitchen.jpg', alt: 'Cocina y comedor', cls: '' },
            { src: '/fotos/living2.jpg', alt: 'Living con sillones', cls: '' },
          ].map((p) => (
            <div key={p.src} className={`relative overflow-hidden rounded-md ${p.cls}`}>
              <Image src={p.src} alt={p.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="fx-pop object-cover" />
            </div>
          ))}
        </Reveal>
      </section>

      {/* RESEÑAS / OTRAS PLATAFORMAS */}
      <ReviewsSection />

      {/* UBICACIÓN */}
      <section id="ubicacion" className="relative flex min-h-[560px] items-center overflow-hidden md:min-h-[640px]">
        <Image src="/fotos/dusk_sea.jpg" alt="Costa de Cáhuil al anochecer" fill sizes="100vw" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-ink/55" />
        <Reveal className="relative mx-auto w-full max-w-[1440px] px-5 md:px-[5%]">
          <div className="max-w-[640px]">
            <p className={eyebrow}>Ubicación</p>
            <h2 className="font-display text-[44px] font-medium leading-[1.02] md:text-[60px]">
              {site.address}, Cáhuil
            </h2>
            <p className="mt-6 text-[17px] leading-[1.7] text-sand">
              Pasado Punta de Lobos, a unos 6 km de la ola más famosa de Chile. Cerca de la laguna y las salinas de Cáhuil.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={site.mapsHref} target="_blank" rel="noreferrer" className="fx-ghost inline-block rounded-full border border-cream px-[26px] py-3.5 font-semibold text-cream">
                Abrir en Google Maps
              </a>
              <a href={site.wazeHref} target="_blank" rel="noreferrer" className="fx-ghost inline-block rounded-full border border-cream/50 px-[26px] py-3.5 font-semibold text-cream">
                Waze
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  )
}
