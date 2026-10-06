-- Guest booking capabilities are random secrets, never exposed by availability queries.
alter table public.bookings add column if not exists management_token uuid;
