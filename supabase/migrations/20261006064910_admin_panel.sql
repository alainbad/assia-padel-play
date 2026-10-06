-- Keep the existing verified owner and remove a recursive admin SELECT policy.
drop policy if exists "Admins can view admins table" on public.admins;
create table if not exists public.site_settings (
 id integer primary key check(id=1), content jsonb not null default '{}',
 schedule jsonb not null default '{"times":["08:00","09:30","11:00","12:30","14:00","15:30","17:00","18:30","20:00","21:30","23:00"],"duration":90,"price":20}',
 updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values(1) on conflict do nothing;
alter table public.site_settings enable row level security;
grant select on public.site_settings to anon,authenticated;
grant update on public.site_settings to authenticated;
create policy "Public court settings" on public.site_settings for select to anon,authenticated using(true);
create policy "Admin settings updates" on public.site_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create table if not exists public.schedule_blocks(date date not null,time text not null check(time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),primary key(date,time));
alter table public.schedule_blocks enable row level security;
grant select,insert,update,delete on public.schedule_blocks to authenticated;
create policy "Admin schedule blocks" on public.schedule_blocks for all to authenticated using(public.is_admin()) with check(public.is_admin());
-- Serialize schedule mutations and check overlapping reservations, including midnight.
create schema if not exists private;
revoke all on schema private from public,anon,authenticated;
create or replace function private.guard_court_booking() returns trigger language plpgsql security definer set search_path='' as $$
declare settings jsonb; starts timestamp; ends timestamp; elevated boolean;
begin
 perform pg_advisory_xact_lock(761204);
 if new.status='cancelled' then return new; end if;
 if TG_OP='UPDATE' and old.status <> 'cancelled' and (new.date,new.time,new.duration) is not distinct from (old.date,old.time,old.duration) then return new; end if;
 select schedule into settings from public.site_settings where id=1;
 elevated := coalesce(auth.role(),'')='service_role' or (auth.uid() is not null and exists(select 1 from public.admins where user_id=auth.uid()));
 if not elevated then
  if new.status <> 'upcoming' or new.payment_status <> 'unpaid' then raise exception 'Invalid reservation status'; end if;
  if not (settings->'times' ? new.time) then raise exception 'This start time is no longer available'; end if;
  new.duration:=(settings->>'duration')::int;new.price:=(settings->>'price')::numeric;
 end if;
 if new.time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or new.duration<30 or new.duration>240 or new.players<1 or new.players>4 or length(trim(new.name))<2 or length(new.phone)<7 or new.price<0 then raise exception 'Invalid reservation details'; end if;
 starts:=new.date+new.time::time;ends:=starts+make_interval(mins=>new.duration);
 if starts < timezone('Asia/Beirut',now()) then raise exception 'Cannot reserve a past time'; end if;
 if exists(select 1 from public.bookings b where b.id<>new.id and b.status<>'cancelled' and (b.date+b.time::time)<ends and (b.date+b.time::time+make_interval(mins=>b.duration))>starts) then raise exception 'This time overlaps an existing reservation'; end if;
 if exists(select 1 from public.schedule_blocks b where (b.date+b.time::time)<ends and (b.date+b.time::time+make_interval(mins=>(settings->>'duration')::int))>starts) then raise exception 'This time is blocked by the court'; end if;
 return new;
end $$;
revoke all on function private.guard_court_booking() from public,anon,authenticated;
create trigger guard_court_booking before insert or update on public.bookings for each row execute function private.guard_court_booking();
create or replace function private.guard_court_block() returns trigger language plpgsql security definer set search_path='' as $$
declare slot_duration int; starts timestamp;
begin
 perform pg_advisory_xact_lock(761204);
 select (schedule->>'duration')::int into slot_duration from public.site_settings where id=1;
 starts:=new.date+new.time::time;
 if exists(select 1 from public.bookings b where b.status<>'cancelled' and (b.date+b.time::time)<starts+make_interval(mins=>slot_duration) and (b.date+b.time::time+make_interval(mins=>b.duration))>starts) then raise exception 'Cancel or move the existing reservation before blocking this slot'; end if;
 return new;
end $$;
revoke all on function private.guard_court_block() from public,anon,authenticated;
create trigger guard_court_block before insert or update on public.schedule_blocks for each row execute function private.guard_court_block();
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('site-images','site-images',true,8388608,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy "Public site photos" on storage.objects for select to anon,authenticated using(bucket_id='site-images');
create policy "Admin photo upload" on storage.objects for insert to authenticated with check(bucket_id='site-images' and public.is_admin());
create policy "Admin photo update" on storage.objects for update to authenticated using(bucket_id='site-images' and public.is_admin()) with check(bucket_id='site-images' and public.is_admin());
create policy "Admin photo delete" on storage.objects for delete to authenticated using(bucket_id='site-images' and public.is_admin());
insert into public.admins(user_id) select id from auth.users where lower(email)='assiapadel@gmail.com' and email_confirmed_at is not null on conflict do nothing;
