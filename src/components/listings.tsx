import { IconExternal, IconStar } from '@/components/icons'
import { Reveal } from '@/components/reveal'
import { site } from '@/lib/site'

/** Sección de la portada con la nota en Airbnb y Booking y el link a cada publicación. */
export function ReviewsSection() {
  return (
    <section id="resenas" className="mx-auto max-w-[1440px] scroll-mt-8 px-5 pb-36 md:px-[5%]">
      <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <h2 className="font-display text-[44px] font-medium leading-[1.02] md:text-[64px]">Lo que dicen nuestros huéspedes</h2>
        <p className="max-w-[380px] text-[15px] text-muted">
          También estamos en Airbnb y Booking. Lee las reseñas allá y reserva directo aquí.
        </p>
      </Reveal>
      <div className="grid gap-5 md:grid-cols-2">
        {site.listings.map((l, i) => (
          <Reveal key={l.id} delay={i * 120}>
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="fx-card group flex h-full flex-col gap-6 rounded-[10px] border border-line bg-surface p-8 md:p-10"
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-[13px] font-bold uppercase tracking-[2.5px] text-amber">{l.name}</span>
                <IconExternal size={20} className="text-muted transition-colors group-hover:text-amber" />
              </div>
              <div className="flex items-end gap-3">
                <span className="font-display text-[84px] font-medium leading-[0.8] md:text-[104px]">{l.rating}</span>
                <span className="pb-1 text-lg text-sub">/ {l.scale}</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-1 text-amber" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, k) => <IconStar key={k} size={16} />)}
                </span>
                <p className="text-[15px] font-semibold">{l.badge}</p>
                <p className="text-sm text-muted">{l.reviews}</p>
              </div>
              <span className="fx-link mt-auto self-start border-b border-amber pb-1 text-[15px] font-semibold text-amber">
                Ver en {l.name} <span className="sr-only">(se abre en otra pestaña)</span>
              </span>
            </a>
          </Reveal>
        ))}
      </div>
    </section>
  )
}

/** Notas compactas para la ficha de cada cabaña. */
export function RatingBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      {site.listings.map((l) => (
        <a
          key={l.id}
          href={l.url}
          target="_blank"
          rel="noreferrer"
          className="fx-ghost inline-flex items-center gap-2 rounded-full border border-cream/15 px-3.5 py-2 text-[13px] text-sub"
        >
          <IconStar size={14} className="text-amber" />
          <strong className="font-bold text-cream">{l.rating}</strong>
          <span>en {l.name} · {l.reviews}</span>
        </a>
      ))}
    </div>
  )
}
