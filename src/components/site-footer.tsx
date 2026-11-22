import Link from 'next/link'
import { site } from '@/lib/site'
import { getSettings, phoneHref, whatsappHref } from '@/lib/settings'

export async function SiteFooter() {
  const s = await getSettings()
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-10 px-5 pb-28 pt-16 md:px-[5%] md:pb-12">
        <div>
          <p className="font-display text-[34px] font-semibold">{site.name}</p>
          <p className="mt-2 text-sm text-muted">
            {site.address} · {site.locality}
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-[15px]">
          <a href={phoneHref(s)} className="fx-link self-start text-amber">{s.contact_phone}</a>
          <a href={`mailto:${s.contact_email}`} className="fx-link self-start text-amber">{s.contact_email}</a>
          <a href={whatsappHref(s)} target="_blank" rel="noreferrer" className="fx-link self-start text-amber">
            Escríbenos por WhatsApp
          </a>
          {s.instagram && (
            <a href={s.instagram.startsWith('http') ? s.instagram : `https://instagram.com/${s.instagram.replace(/^@/, '')}`} target="_blank" rel="noreferrer" className="fx-link self-start text-amber">
              Instagram
            </a>
          )}
        </div>
        <div className="flex flex-col gap-2.5 text-sm text-muted">
          <Link href="/cabanas" className="fx-link self-start">Ver disponibilidad</Link>
          <Link href="/condiciones" className="fx-link self-start">Condiciones de reserva</Link>
          <p className="mt-3 text-xs uppercase tracking-[2px] text-muted/80">También estamos en</p>
          {site.listings.map((l) => (
            <a key={l.id} href={l.url} target="_blank" rel="noreferrer" className="fx-link self-start">
              {l.name} · ★ {l.rating}
            </a>
          ))}
        </div>
      </div>
    </footer>
  )
}
