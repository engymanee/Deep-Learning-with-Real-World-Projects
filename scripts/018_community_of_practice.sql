-- ============================================================================
-- Community of Practice - schema
-- ============================================================================
-- Three minimal tables that together hold everything admins said the CoP
-- needs to support today and tomorrow:
--
--   community_events    shared dates / gatherings / podcast live sessions
--   community_posts     blog posts, "practical wisdom in action" stories,
--                       and written podcast notes - any long-form content
--   community_resources curated links: articles, videos, podcast feeds,
--                       books, library PDFs, external communities
--
-- Read access: any authenticated program member (fellows, facilitators,
--              admins). Fellows are restricted to published posts.
-- Write access: admins only, using the existing is_admin() helper.
-- Deletes cascade cleanly because the only FK is author_id/created_by
-- which nulls out if a profile is removed.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. community_events
-- ---------------------------------------------------------------------------
create table if not exists public.community_events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  location        text,                         -- physical address or URL
  starts_at       timestamptz not null,
  ends_at         timestamptz,
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists community_events_starts_at_idx
  on public.community_events (starts_at desc);

drop trigger if exists community_events_set_updated_at on public.community_events;
create trigger community_events_set_updated_at
  before update on public.community_events
  for each row execute function public.set_updated_at();

alter table public.community_events enable row level security;

drop policy if exists "community_events read" on public.community_events;
create policy "community_events read"
  on public.community_events for select
  to authenticated
  using (true);

drop policy if exists "community_events admin write" on public.community_events;
create policy "community_events admin write"
  on public.community_events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 2. community_posts
-- ---------------------------------------------------------------------------
create table if not exists public.community_posts (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  title           text not null,
  excerpt         text,
  body            text not null default '',
  category        text not null default 'blog'
                    check (category in ('blog', 'podcast', 'wisdom_in_action')),
  cover_image_url text,
  published       boolean not null default false,
  published_at    timestamptz,
  author_id       uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists community_posts_published_at_idx
  on public.community_posts (published, published_at desc);

drop trigger if exists community_posts_set_updated_at on public.community_posts;
create trigger community_posts_set_updated_at
  before update on public.community_posts
  for each row execute function public.set_updated_at();

alter table public.community_posts enable row level security;

-- Fellows and facilitators only see published posts; admins see everything.
drop policy if exists "community_posts read" on public.community_posts;
create policy "community_posts read"
  on public.community_posts for select
  to authenticated
  using (published = true or public.is_admin());

drop policy if exists "community_posts admin write" on public.community_posts;
create policy "community_posts admin write"
  on public.community_posts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- 3. community_resources
-- ---------------------------------------------------------------------------
create table if not exists public.community_resources (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  description     text,
  url             text not null,
  resource_type   text not null default 'article'
                    check (resource_type in
                      ('article', 'video', 'podcast', 'book', 'pdf', 'link')),
  tags            text[] not null default '{}',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists community_resources_created_at_idx
  on public.community_resources (created_at desc);

drop trigger if exists community_resources_set_updated_at on public.community_resources;
create trigger community_resources_set_updated_at
  before update on public.community_resources
  for each row execute function public.set_updated_at();

alter table public.community_resources enable row level security;

drop policy if exists "community_resources read" on public.community_resources;
create policy "community_resources read"
  on public.community_resources for select
  to authenticated
  using (true);

drop policy if exists "community_resources admin write" on public.community_resources;
create policy "community_resources admin write"
  on public.community_resources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
