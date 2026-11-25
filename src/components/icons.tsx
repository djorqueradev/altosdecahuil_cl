import type { SVGProps } from 'react'

type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 24, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...rest,
  }
}

export const IconFire = (p: P) => (<svg {...base(p)}><path d="M12 3c2 3 5 5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-8z" /></svg>)
export const IconDeck = (p: P) => (<svg {...base(p)}><path d="M3 21h18M5 21V10h14v11M3 10h18M8 10V6h8v4" /></svg>)
export const IconKitchen = (p: P) => (<svg {...base(p)}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 10h16M8 6.5h.01M8 14v3" /></svg>)
export const IconCar = (p: P) => (<svg {...base(p)}><rect x="3" y="7" width="18" height="12" rx="2" /><path d="M7 7l2-3h6l2 3M7 19v2M17 19v2" /></svg>)
export const IconTv = (p: P) => (<svg {...base(p)}><rect x="2" y="5" width="20" height="13" rx="2" /><path d="M8 21h8" /></svg>)
export const IconBed = (p: P) => (<svg {...base(p)}><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6M3 18h18M6 10V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v3" /></svg>)
export const IconWifi = (p: P) => (<svg {...base(p)}><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01" /></svg>)
export const IconCheck = (p: P) => (<svg {...base(p)}><path d="M5 12l5 5 9-10" /></svg>)
export const IconLock = (p: P) => (<svg {...base(p)}><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>)
export const IconCard = (p: P) => (<svg {...base(p)}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>)
export const IconMail = (p: P) => (<svg {...base(p)}><path d="M4 4h16v16H4zM4 7l8 6 8-6" /></svg>)
export const IconChat = (p: P) => (<svg {...base(p)}><path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5.2A8.5 8.5 0 1 1 21 12z" /></svg>)
export const IconPin = (p: P) => (<svg {...base(p)}><path d="M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z" /><circle cx="12" cy="9" r="2.5" /></svg>)
export const IconChevronLeft = (p: P) => (<svg {...base(p)}><path d="M15 6l-6 6 6 6" /></svg>)
export const IconChevronRight = (p: P) => (<svg {...base(p)}><path d="M9 6l6 6-6 6" /></svg>)
export const IconMenu = (p: P) => (<svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>)
export const IconClose = (p: P) => (<svg {...base(p)}><path d="M6 6l12 12M18 6L6 18" /></svg>)
export const IconCalendar = (p: P) => (<svg {...base(p)}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>)
export const IconList = (p: P) => (<svg {...base(p)}><path d="M4 6h16M4 12h16M4 18h10" /></svg>)
export const IconHome = (p: P) => (<svg {...base(p)}><path d="M3 21V10l9-7 9 7v11M9 21v-6h6v6" /></svg>)
export const IconSync = (p: P) => (<svg {...base(p)}><path d="M4 12a8 8 0 0 1 14-5l2-2v6h-6l2-2a5 5 0 1 0 1 6" /></svg>)
export const IconBan = (p: P) => (<svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M5.6 5.6l12.8 12.8" /></svg>)
export const IconLogout = (p: P) => (<svg {...base(p)}><path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3" /></svg>)
export const IconShare = (p: P) => (<svg {...base(p)}><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v13" /></svg>)
export const IconStar = (p: P) => (<svg {...base(p)} fill="currentColor" stroke="none"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z" /></svg>)
export const IconExternal = (p: P) => (<svg {...base(p)}><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>)

const AMENITY_ICONS: Record<string, (p: P) => React.JSX.Element> = {
  fogón: IconFire,
  parrilla: IconFire,
  terraza: IconDeck,
  cocina: IconKitchen,
  estacionamiento: IconCar,
  tv: IconTv,
  living: IconTv,
  cama: IconBed,
  'wi-fi': IconWifi,
  wifi: IconWifi,
}

export function AmenityIcon({ label, ...p }: P & { label: string }) {
  const key = Object.keys(AMENITY_ICONS).find((k) => label.toLowerCase().includes(k))
  const Icon = key ? AMENITY_ICONS[key] : IconCheck
  return <Icon {...p} />
}
export const IconEye = (p: P) => (<svg {...base(p)}><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></svg>)
export const IconEyeOff = (p: P) => (<svg {...base(p)}><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7c1.7 0 3.2-.5 4.5-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2" /></svg>)
