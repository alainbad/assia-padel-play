-- Lets clients subscribe to live changes on the bookings table (used for
-- the admin's "new booking" in-app notification). RLS still applies to
-- realtime delivery: only sessions that satisfy the existing "Admins can
-- view all bookings" SELECT policy actually receive these events, so
-- non-admin sessions subscribing to this channel get nothing.
-- Run this once against the connected Supabase project (paste into the
-- Lovable chat and ask it to run the migration, same as previous ones).

alter publication supabase_realtime add table public.bookings;
