-- Storage bucket for admin profile photos. Run this once against the
-- connected Supabase project (paste into the Lovable chat and ask it to
-- run the migration, same as previous migrations on this project).

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "Avatar images are publicly accessible"
on storage.objects for select
using (bucket_id = 'avatars');

create policy "Admins can upload avatars"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and public.is_admin());

create policy "Admins can update avatars"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and public.is_admin())
with check (bucket_id = 'avatars' and public.is_admin());

create policy "Admins can delete avatars"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and public.is_admin());
