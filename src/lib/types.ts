export type Cabin = {
  id: string
  slug: string
  name: string
  short_description: string
  description: string
  capacity: number
  bedrooms_summary: string
  price_per_night: number
  cleaning_fee: number
  min_nights: number
  cover_image: string
  gallery: string[]
  amenities: string[]
  ical_export_token: string
  sort_order: number
  active: boolean
}

/** Lo que se puede mostrar en el sitio público (sin el token de exportación). */
export type PublicCabin = Omit<Cabin, 'ical_export_token' | 'active' | 'sort_order'>

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'expired'
export type BookingSource = 'direct' | 'manual'
export type Channel = 'booking' | 'airbnb' | 'hospitable'

export type Booking = {
  id: string
  code: string
  cabin_id: string
  check_in: string
  check_out: string
  guests: number
  guest_first_name: string
  guest_last_name: string
  guest_email: string
  guest_phone: string
  guest_document: string | null
  arrival_window: string | null
  notes: string | null
  nights: number
  price_per_night: number
  subtotal: number
  cleaning_fee: number
  total: number
  status: BookingStatus
  source: BookingSource
  expires_at: string | null
  mp_order_id: string | null
  mp_payment_id: string | null
  paid_at: string | null
  admin_alert: string | null
  amount_paid: number
  payment_method: string | null
  internal_notes: string | null
  send_emails?: boolean
  reminder_sent_at?: string | null
  thanks_sent_at?: string | null
  created_at: string
}

export type BusyRange = { start: string; end: string; kind: string }
