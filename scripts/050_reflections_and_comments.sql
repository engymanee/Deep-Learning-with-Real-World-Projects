-- Community of Practice phase 2 migration.
--
-- Adds:
--   1. A stable surrogate `id uuid` on user_content_reflections so
--      other tables (comments, reactions later) can FK to it
--      without dragging the composite (profile_id, content_id) key.
--   2. A `visibility` column controlling who sees each reflection.
--      Default is 'public' so the Community feed becomes useful
--      immediately; users can flip to 'private' from the UI.
--   3. A polymorphic `community_comments` table able to attach to
--      either a community post or a reflection.
--
-- All changes are additive. Existing rows pick up a UUID via the
-- column default and 'public' visibility - nothing is destructive.

alter table public.user_content_reflections
  add column if not exists id uuid not null default gen_random_uuid(),
  add column if not exists visibility text not null default 'public';

update public.user_content_reflections
   set id = gen_random_uuid()
 where id is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_content_reflections_id_key'
  ) then
    alter table public.user_content_reflections
      add constraint user_content_reflections_id_key unique (id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'user_content_reflections_visibility_check'
  ) then
    alter table public.user_content_reflections
      add constraint user_content_reflections_visibility_check
      check (visibility in ('public', 'cohort', 'private')) not valid;
    alter table public.user_content_reflections
      validate constraint user_content_reflections_visibility_check;
  end if;
end $$;

drop policy if exists "Authenticated read non-private reflections"
  on public.user_content_reflections;
create policy "Authenticated read non-private reflections"
  on public.user_content_reflections for select
  to authenticated
  using (visibility <> 'private');

create table if not exists public.community_comments (
  id                uuid primary key default gen_random_uuid(),
  subject_type      text not null,
  subject_id        uuid not null,
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  parent_comment_id uuid references public.community_comments(id) on delete cascade,
  body              text not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  deleted_at        timestamptz,
  constraint community_comments_subject_type_check
    check (subject_type in ('post', 'reflection')),
  constraint community_comments_body_len_check
    check (char_length(body) between 1 and 4000)
);

create index if not exists community_comments_subject_idx
  on public.community_comments (subject_type, subject_id, created_at);
create index if not exists community_comments_profile_idx
  on public.community_comments (profile_id);

alter table public.community_comments enable row level security;

drop policy if exists "Authenticated read comments"
  on public.community_comments;
create policy "Authenticated read comments"
  on public.community_comments for select
  to authenticated using (true);

drop policy if exists "Users insert own comments"
  on public.community_comments;
create policy "Users insert own comments"
  on public.community_comments for insert
  to authenticated with check (profile_id = auth.uid());

drop policy if exists "Users update own comments"
  on public.community_comments;
create policy "Users update own comments"
  on public.community_comments for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "Users delete own comments"
  on public.community_comments;
create policy "Users delete own comments"
  on public.community_comments for delete
  to authenticated using (profile_id = auth.uid());

create or replace function public.community_comments_cleanup_post()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  delete from public.community_comments
   where subject_type = 'post' and subject_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_community_comments_cleanup_post
  on public.community_posts;
create trigger trg_community_comments_cleanup_post
  before delete on public.community_posts
  for each row execute function public.community_comments_cleanup_post();

create or replace function public.community_comments_cleanup_reflection()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  delete from public.community_comments
   where subject_type = 'reflection' and subject_id = old.id;
  return old;
end;
$$;

drop trigger if exists trg_community_comments_cleanup_reflection
  on public.user_content_reflections;
create trigger trg_community_comments_cleanup_reflection
  before delete on public.user_content_reflections
  for each row execute function public.community_comments_cleanup_reflection();
