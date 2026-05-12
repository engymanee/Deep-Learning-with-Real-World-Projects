-- Community of Practice phase 1 migration.
--
-- All changes here are additive: existing rows keep their data and
-- gain NULL/false defaults on the new columns. Nothing in this file
-- drops, renames, or rewrites a column.

-- 1. Profile enrichment ------------------------------------------------------

alter table public.profiles
  add column if not exists linkedin_url text,
  add column if not exists twitter_url text,
  add column if not exists website_url text,
  add column if not exists looking_for text,
  add column if not exists willing_to_help text,
  add column if not exists years_in_education integer,
  add column if not exists community_role text,
  add column if not exists featured_member_from timestamptz,
  add column if not exists featured_member_until timestamptz;

-- 2. Library frameworks ------------------------------------------------------

alter table public.community_resources
  add column if not exists is_pwf_protocol boolean not null default false;

create index if not exists community_resources_pwf_protocol_idx
  on public.community_resources (is_pwf_protocol)
  where is_pwf_protocol = true;

-- 3. Community post additions ------------------------------------------------

alter table public.community_posts
  add column if not exists framework_resource_id uuid
    references public.community_resources (id) on delete set null,
  add column if not exists ask_category text,
  add column if not exists ask_status text,
  add column if not exists featured_at timestamptz,
  add column if not exists is_archived boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'community_posts_ask_category_check'
  ) then
    alter table public.community_posts
      add constraint community_posts_ask_category_check
      check (
        ask_category is null
        or ask_category in ('general', 'instructional', 'school_team', 'waw')
      ) not valid;
    alter table public.community_posts
      validate constraint community_posts_ask_category_check;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'community_posts_ask_status_check'
  ) then
    alter table public.community_posts
      add constraint community_posts_ask_status_check
      check (
        ask_status is null
        or ask_status in ('open', 'answered', 'closed')
      ) not valid;
    alter table public.community_posts
      validate constraint community_posts_ask_status_check;
  end if;
end $$;

-- 4. Reactions ---------------------------------------------------------------

create table if not exists public.community_post_reactions (
  post_id    uuid not null
             references public.community_posts (id) on delete cascade,
  profile_id uuid not null
             references public.profiles (id) on delete cascade,
  kind       text not null default 'cheer',
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id, kind)
);

create index if not exists community_post_reactions_post_idx
  on public.community_post_reactions (post_id, kind);

alter table public.community_post_reactions enable row level security;

drop policy if exists "Authenticated can read reactions"
  on public.community_post_reactions;
create policy "Authenticated can read reactions"
  on public.community_post_reactions
  for select
  to authenticated
  using (true);

drop policy if exists "Users insert their own reactions"
  on public.community_post_reactions;
create policy "Users insert their own reactions"
  on public.community_post_reactions
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists "Users delete their own reactions"
  on public.community_post_reactions;
create policy "Users delete their own reactions"
  on public.community_post_reactions
  for delete
  to authenticated
  using (profile_id = auth.uid());
