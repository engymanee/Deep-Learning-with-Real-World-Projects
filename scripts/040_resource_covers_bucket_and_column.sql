-- Per-resource cover image. Rendered as the hero of the library
-- card so fellows immediately see what each resource is about
-- instead of a generic type icon.
alter table public.community_resources
  add column if not exists cover_url text;

comment on column public.community_resources.cover_url is
  'Public URL of the resource cover image. Stored in the resource-covers bucket; null falls back to a type-icon panel.';

-- Storage bucket for cover images. Public-read so the URL can sit
-- straight in <img src> on the Library cards.
insert into storage.buckets (id, name, public)
values ('resource-covers', 'resource-covers', true)
on conflict (id) do update set public = excluded.public;

-- Anyone authenticated or not can view the covers.
drop policy if exists "Resource covers are publicly readable"
  on storage.objects;
create policy "Resource covers are publicly readable"
  on storage.objects for select
  using (bucket_id = 'resource-covers');

-- Only admins / facilitators can upload, replace, or delete cover
-- images. We resolve the caller's role through public.profiles
-- because the role lives there (same approach used by the
-- addLibraryResource server action).
drop policy if exists "Staff manage resource covers"
  on storage.objects;
create policy "Staff manage resource covers"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'resource-covers'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'facilitator')
    )
  )
  with check (
    bucket_id = 'resource-covers'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role in ('admin', 'facilitator')
    )
  );
