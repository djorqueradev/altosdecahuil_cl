// Datos fijos del negocio. Edita aquí lo que está entre corchetes.
export const site = {
  name: 'Altos de Cahuil',
  tagline: 'Cabañas · Pichilemu',
  address: 'Ruta Costera 952',
  locality: 'Cáhuil, Pichilemu',
  region: "Región de O'Higgins, Chile",
  directionsHint: 'Pasado Punta de Lobos, camino a Cáhuil.',
  phone: '+56 9 8197 5916',
  phoneHref: 'tel:+56981975916',
  whatsappHref: 'https://wa.me/56981975916',
  email: 'altos.cahuil@gmail.com',
  instagramHref: '', // ej: 'https://instagram.com/altosdecahuil'
  mapsHref: 'https://www.google.com/maps/search/?api=1&query=Ruta+Costera+952+Cahuil+Pichilemu',
  wazeHref: 'https://waze.com/ul?q=Ruta%20Costera%20952%20Cahuil%20Pichilemu',
  checkInFrom: '[HH:MM]',
  checkOutUntil: '[HH:MM]',
  cancellationPolicy: '[Tu política de cancelación]',
  petsPolicy: '[Sí / No]',
  nearby: [
    { name: 'Punta de Lobos', distance: '≈ 6 km' },
    { name: 'Laguna de Cáhuil', distance: '[distancia]' },
    { name: 'Centro de Pichilemu', distance: '[distancia]' },
  ],
  // Datos prácticos que aparecen en el correo de recordatorio (tomados de las publicaciones en Airbnb/Booking).
  stayTips: [
    { title: 'Estacionamiento', text: 'Gratis, dentro del terreno.' },
    { title: 'Playa', text: 'La playa La Pancora está a unos 5 minutos caminando.' },
    { title: 'Parrilla', text: 'Hay parrilla y mesa para comer al aire libre en el patio.' },
  ],
  // Publicaciones en otras plataformas. Actualiza la nota y el número de reseñas cuando cambien.
  listings: [
    {
      id: 'airbnb',
      name: 'Airbnb',
      url: 'https://www.airbnb.cl/rooms/772297721920795293',
      rating: '4,97',
      scale: '5',
      reviews: '35 reseñas',
      badge: 'Favorito entre huéspedes · Superanfitriona',
    },
    {
      id: 'booking',
      name: 'Booking.com',
      url: 'https://www.booking.com/hotel/cl/cabanas-altos-de-cahuil-cahuil1.es.html',
      rating: '9,3',
      scale: '10',
      reviews: '24 comentarios',
      badge: 'Fantástico',
    },
  ],
  timeZone: 'America/Santiago',
  // Minutos que se reservan las fechas mientras el huésped paga en Mercado Pago
  paymentHoldMinutes: 30,
} as const
