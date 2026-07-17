alter table public.bookings
  add column if not exists attire text not null default '',
  add column if not exists pendamping text not null default '';
