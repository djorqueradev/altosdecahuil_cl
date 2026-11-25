-- "Abrir fechas": permite liberar noches que Booking/Airbnb marcan como cerradas por error
-- (por ejemplo, una unidad que Booking deja cerrada todo el año). Nunca libera reservas
-- de Airbnb ("Reserved") ni eventos que aparecieron después de abrir las fechas.

alter table public.external_events
  add column if not exists first_seen_at timestamptz not null default now();

create table if not exists public.open_dates (
  id uuid primary key default gen_random_uuid(),
  cabin_id uuid not null references public.cabins(id) on delete cascade,
  start_date date not null,
  end_date date not null,               -- exclusivo (día siguiente a la última noche)
  note text not null default '',
  created_at timestamptz not null default now(),
  constraint open_dates_ok check (end_date > start_date)
);
create index if not exists open_dates_cabin_idx on public.open_dates (cabin_id, start_date, end_date);
alter table public.open_dates enable row level security;
revoke all on public.open_dates from anon, authenticated;

-- Eventos de Booking/Airbnb ya descontando las noches abiertas a mano.
-- Un evento puede quedar partido en varios tramos (mismo id, distinto start_date).
create or replace view public.external_busy with (security_invoker = true) as
with nights as (
  select e.id, e.cabin_id, e.channel, e.summary, e.start_date as orig_start, e.end_date as orig_end, d::date as night
    from public.external_events e
   cross join lateral generate_series(e.start_date, e.end_date - 1, interval '1 day') d
   where not (
     coalesce(e.summary, '') !~* 'reserv'
     and exists (
       select 1 from public.open_dates o
        where o.cabin_id = e.cabin_id
          and d::date >= o.start_date and d::date < o.end_date
          and o.created_at >= e.first_seen_at
     )
   )
), grp as (
  select n.*, n.night - (row_number() over (partition by n.id order by n.night))::int as g from nights n
)
select id, cabin_id, channel, summary, orig_start, orig_end, min(night) as start_date, max(night) + 1 as end_date
  from grp
 group by id, cabin_id, channel, summary, orig_start, orig_end, g;

revoke all on public.external_busy from anon, authenticated;
grant select on public.external_busy to service_role;

create or replace function public.cabin_busy_ranges(p_cabin uuid, p_from date, p_to date)
returns table (start_date date, end_date date, kind text)
language sql stable security definer set search_path = '' as $$
  select b.check_in, b.check_out, 'booking'
    from public.bookings b
   where b.cabin_id = p_cabin
     and (b.status = 'confirmed' or (b.status = 'pending' and b.expires_at > now()))
     and b.check_in < p_to and b.check_out > p_from
  union all
  select k.start_date, k.end_date, 'block'
    from public.blocks k
   where k.cabin_id = p_cabin and k.start_date < p_to and k.end_date > p_from
  union all
  select e.start_date, e.end_date, e.channel::text
    from public.external_busy e
   where e.cabin_id = p_cabin and e.start_date < p_to and e.end_date > p_from
$$;
revoke all on function public.cabin_busy_ranges(uuid, date, date) from public, anon, authenticated;
grant execute on function public.cabin_busy_ranges(uuid, date, date) to service_role;

create or replace function public.create_direct_booking(
  p_cabin_slug text,
  p_check_in date,
  p_check_out date,
  p_guests int,
  p_first_name text,
  p_last_name text,
  p_email text,
  p_phone text,
  p_document text,
  p_arrival_window text,
  p_notes text,
  p_hold_minutes int default 30
) returns public.bookings
language plpgsql security definer set search_path = '' as $$
declare
  v_cabin public.cabins;
  v_q record;
  v_hold int;
  v_booking public.bookings;
begin
  select * into v_cabin from public.cabins where slug = p_cabin_slug and active;
  if not found then raise exception 'CABIN_NOT_FOUND'; end if;

  if p_check_out - p_check_in < 1 then raise exception 'INVALID_DATES'; end if;
  if p_check_in < (now() at time zone 'America/Santiago')::date then raise exception 'PAST_DATES'; end if;
  if p_guests < 1 or p_guests > v_cabin.capacity then raise exception 'TOO_MANY_GUESTS:%', v_cabin.capacity; end if;

  select * into v_q from public.quote_stay(v_cabin.id, p_check_in, p_check_out);
  if v_q.has_unpriced then raise exception 'PRICE_NOT_SET'; end if;
  if v_q.nights < v_q.min_nights then raise exception 'MIN_NIGHTS:%', v_q.min_nights; end if;

  select coalesce((select payment_hold_minutes from public.settings where id = 1), p_hold_minutes) into v_hold;

  update public.bookings
     set status = 'expired'
   where cabin_id = v_cabin.id and status = 'pending' and expires_at <= now();

  if exists (
    select 1 from public.blocks k
     where k.cabin_id = v_cabin.id and k.start_date < p_check_out and k.end_date > p_check_in
    union all
    select 1 from public.external_busy e
     where e.cabin_id = v_cabin.id and e.start_date < p_check_out and e.end_date > p_check_in
  ) then
    raise exception 'NOT_AVAILABLE';
  end if;

  begin
    insert into public.bookings (
      cabin_id, check_in, check_out, guests,
      guest_first_name, guest_last_name, guest_email, guest_phone, guest_document,
      arrival_window, notes,
      price_per_night, subtotal, cleaning_fee, total,
      status, source, expires_at
    ) values (
      v_cabin.id, p_check_in, p_check_out, p_guests,
      p_first_name, p_last_name, lower(p_email), p_phone, nullif(p_document, ''),
      nullif(p_arrival_window, ''), nullif(p_notes, ''),
      round(v_q.subtotal::numeric / v_q.nights)::int, v_q.subtotal, v_q.cleaning_fee, v_q.total,
      'pending', 'direct', now() + make_interval(mins => v_hold)
    ) returning * into v_booking;
  exception when exclusion_violation then
    raise exception 'NOT_AVAILABLE';
  end;

  return v_booking;
end $$;

revoke all on function public.create_direct_booking(text, date, date, int, text, text, text, text, text, text, text, int)
  from public, anon, authenticated;
grant execute on function public.create_direct_booking(text, date, date, int, text, text, text, text, text, text, text, int)
  to service_role;
