-- Tracks admin-confirmed payment progress per booking, separate from the
-- booking's upcoming/completed/cancelled status. Run this once against the
-- connected Supabase project (paste into the Lovable chat and ask it to run
-- the migration, or run directly in the Supabase SQL editor).

alter table public.bookings
  add column if not exists payment_status text not null default 'unpaid'
  check (payment_status in ('unpaid', 'deposit', 'paid'));

-- No RLS changes needed: the existing "Admins can update bookings" policy
-- already covers updates to this new column.
