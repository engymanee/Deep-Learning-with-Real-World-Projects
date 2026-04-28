-- Phase 4 of the content-progression model.
-- Adds three things:
--   1. Per-content "reflection" config on labs (enabled flag + prompt).
--   2. user_content_reflections - one row per (user, content) capturing
--      the fellow's written response.
--   3. user_content_link_clicks - one row per (user, content) recording
--      that the fellow opened the linked resource at least once.
--
-- The viewer uses #2 and #3 as gates: a fellow can only mark an item
-- complete once every applicable precondition is satisfied.
-- All RLS policies scope rows to the row owner.

alter table public.labs
  add column if not exists reflection_enabled boolean not null default false,
  add column if not exists reflection_prompt  text;

-- ----------------------------------------------------------------------
-- Reflections
-- ----------------------------------------------------------------------
create table if not exists public.user_content_reflections (
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  content_id   text not null references public.labs(id) on delete cascade,
  response     text not null,
  submitted_at timestamptz not null default now(),
  primary key (profile_id, content_id)
);

create index if not exists user_content_reflections_profile_idx
  on public.user_content_reflections (profile_id);
create index if not exists user_content_reflections_content_idx
  on public.user_content_reflections (content_id);

alter table public.user_content_reflections enable row level security;

drop policy if exists "Users select own reflections"
  on public.user_content_reflections;
drop policy if exists "Users upsert own reflections"
  on public.user_content_reflections;
drop policy if exists "Users update own reflections"
  on public.user_content_reflections;
drop policy if exists "Users delete own reflections"
  on public.user_content_reflections;

create policy "Users select own reflections"
  on public.user_content_reflections for select
  using (profile_id = auth.uid());

create policy "Users upsert own reflections"
  on public.user_content_reflections for insert
  with check (profile_id = auth.uid());

create policy "Users update own reflections"
  on public.user_content_reflections for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy "Users delete own reflections"
  on public.user_content_reflections for delete
  using (profile_id = auth.uid());

-- ----------------------------------------------------------------------
-- Link clicks
-- ----------------------------------------------------------------------
create table if not exists public.user_content_link_clicks (
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  content_id  text not null references public.labs(id) on delete cascade,
  clicked_at  timestamptz not null default now(),
  primary key (profile_id, content_id)
);

create index if not exists user_content_link_clicks_profile_idx
  on public.user_content_link_clicks (profile_id);

alter table public.user_content_link_clicks enable row level security;

drop policy if exists "Users select own link clicks"
  on public.user_content_link_clicks;
drop policy if exists "Users insert own link clicks"
  on public.user_content_link_clicks;
drop policy if exists "Users delete own link clicks"
  on public.user_content_link_clicks;

create policy "Users select own link clicks"
  on public.user_content_link_clicks for select
  using (profile_id = auth.uid());

create policy "Users insert own link clicks"
  on public.user_content_link_clicks for insert
  with check (profile_id = auth.uid());

create policy "Users delete own link clicks"
  on public.user_content_link_clicks for delete
  using (profile_id = auth.uid());
