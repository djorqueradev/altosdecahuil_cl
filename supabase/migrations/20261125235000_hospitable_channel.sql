-- Hospitable (channel manager) como nuevo canal: centraliza Airbnb y Booking.com.
alter type public.channel add value if not exists 'hospitable';
