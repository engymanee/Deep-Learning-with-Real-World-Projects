-- Public-read storage bucket for profile photos. The avatar_url
-- column on public.profiles already exists; this migration creates
-- the bucket the upload action will write into and the RLS policies
-- that gate writes to "the authenticated user's own folder".
--
-- Why public read: the avatar URL ends up in <img src> tags across
-- the directory, the top bar, and story cards. A signed URL would
-- complicate every render path with no real benefit since these are
-- public-facing photos people opted in to.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = excluded.public;

-- Anyone (authenticated or not) can read avatars.
drop policy if exists "Avatars are publicly readable"
  on storage.objects;
create policy "Avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Authenticated users can upload, replace, and delete files only
-- inside a top-level folder named after their own auth.uid(). The
-- upload server action enforces the same path on the way in.
drop policy if exists "Users manage their own avatar"
  on storage.objects;
create policy "Users manage their own avatar"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
