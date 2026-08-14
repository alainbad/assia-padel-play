-- Assia Padel Court — bookings + admin schema
-- Run this once against your Supabase project (SQL Editor, or `supabase db push`).

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  date date not null,
  time text not null,
  duration integer not null default 90,
  name text not null,
  phone text not null,
  email text,
  players integer not null default 4,
  notes text,
  price numeric not null,
  payment_method text not null check (payment_method in ('court', 'whish')),
  court_name text not null default 'Court 1',
  status text not null default 'upcoming' check (status in ('upcoming', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

-- Prevent two active bookings from ever occupying the same date+time,
-- even under concurrent requests from different devices.
create unique index if not exists bookings_date_time_active_idx
  on public.bookings (date, time)
  where status <> 'cancelled';

alter table public.bookings enable row level security;

-- Who is allowed to see everything (the admin dashboard).
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;

create policy "Admins can view admins table"
  on public.admins for select
  to authenticated
  using (public.is_admin());

-- ── bookings policies ────────────────────────────────────────────────
-- Customers (anonymous, no login) can create a booking directly.
create policy "Anyone can create a booking"
  on public.bookings for insert
  to anon, authenticated
  with check (status = 'upcoming');

-- Only admins get raw table access — customers never get a public
-- SELECT/UPDATE on the table itself, so phone/email/notes stay private.
create policy "Admins can view all bookings"
  on public.bookings for select
  to authenticated
  using (public.is_admin());

create policy "Admins can update bookings"
  on public.bookings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "Admins can delete bookings"
  on public.bookings for delete
  to authenticated
  using (public.is_admin());

-- ── public helper functions (security definer) ──────────────────────
-- Availability grid: booked times for a date, no personal data exposed.
create or replace function public.get_booked_times(p_date date)
returns table(time text)
language sql
security definer
set search_path = public
stable
as $$
  select b.time from public.bookings b
  where b.date = p_date and b.status <> 'cancelled';
$$;

grant execute on function public.get_booked_times(date) to anon, authenticated;

-- Customer self-service: looking up / cancelling your own booking only
-- works if you know both the row id and its reference code (the pair
-- act like a shared secret — both are handed to the customer at booking
-- time and neither is guessable).
create or replace function public.get_booking_by_reference(p_id uuid, p_reference text)
returns setof public.bookings
language sql
security definer
set search_path = public
stable
as $$
  select * from public.bookings where id = p_id and reference = p_reference;
$$;

grant execute on function public.get_booking_by_reference(uuid, text) to anon, authenticated;

create or replace function public.cancel_booking_by_reference(p_id uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.bookings
  set status = 'cancelled'
  where id = p_id and reference = p_reference and status = 'upcoming';
end;
$$;

grant execute on function public.cancel_booking_by_reference(uuid, text) to anon, authenticated;

-- ── one-time admin setup ─────────────────────────────────────────────
-- 1. Supabase Dashboard → Authentication → Users → Add user (email + password).
--    That's the login the admin will use on /admin/login.
-- 2. Then run, with that email:
--
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'admin@example.com';
