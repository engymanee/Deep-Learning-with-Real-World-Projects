-- =============================================================================
-- Community Reflection Reactions
-- Mirrors community_post_reactions but for reflections
-- Users can react to reflections with emoji/kind (like, love, inspire, helpful)
-- =============================================================================

create table if not exists public.community_reflection_reactions (
  reflection_id uuid not null references public.user_content_reflections(id) on delete cascade,
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  kind          text not null default 'cheer',
  created_at    timestamptz not null default now(),
  primary key (reflection_id, profile_id, kind)
);

-- Index for quick lookups by reflection
create index if not exists community_reflection_reactions_reflection_idx 
  on public.community_reflection_reactions(reflection_id);

-- Index for user's reactions
create index if not exists community_reflection_reactions_profile_idx 
  on public.community_reflection_reactions(profile_id);

-- Enable RLS
alter table public.community_reflection_reactions enable row level security;

-- Allow authenticated users to read all reactions
drop policy if exists "Authenticated can read reflection reactions" on public.community_reflection_reactions;
create policy "Authenticated can read reflection reactions" on public.community_reflection_reactions
  for select to authenticated using (true);

-- Allow users to insert their own reactions
drop policy if exists "Users insert own reflection reactions" on public.community_reflection_reactions;
create policy "Users insert own reflection reactions" on public.community_reflection_reactions
  for insert to authenticated
  with check (profile_id = auth.uid());

-- Allow users to delete their own reactions
drop policy if exists "Users delete own reflection reactions" on public.community_reflection_reactions;
create policy "Users delete own reflection reactions" on public.community_reflection_reactions
  for delete to authenticated
  using (profile_id = auth.uid());
