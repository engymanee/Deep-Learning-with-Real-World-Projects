-- =============================================================================
-- User Content Reflections — Row Level Security
-- Reflections are readable by authenticated users based on visibility:
--   - 'public' → all authenticated users can read
--   - 'cohort' → only cohort members can read (plus staff)
--   - 'private' → never readable in community view (owner-only)
-- Only the author can write/update/delete their own reflections
-- =============================================================================

alter table public.user_content_reflections enable row level security;

-- Authenticated users can read public and cohort reflections (respecting visibility)
drop policy if exists "reflections read public" on public.user_content_reflections;
create policy "reflections read public" on public.user_content_reflections
  for select to authenticated using (
    visibility = 'public'
    or (visibility = 'cohort' and (
      public.is_staff() or
      exists (
        select 1 from public.user_content_reflections ucr
        where ucr.id = user_content_reflections.id
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
          and p.cohort is not null
          and p.cohort = (
            select cohort from public.profiles
            where id = user_content_reflections.profile_id
          )
        )
      )
    ))
  );

-- Authors can insert their own reflections
drop policy if exists "reflections author insert" on public.user_content_reflections;
create policy "reflections author insert" on public.user_content_reflections
  for insert to authenticated
  with check (profile_id = auth.uid());

-- Authors can update their own reflections
drop policy if exists "reflections author update" on public.user_content_reflections;
create policy "reflections author update" on public.user_content_reflections
  for update to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

-- Authors can delete their own reflections
drop policy if exists "reflections author delete" on public.user_content_reflections;
create policy "reflections author delete" on public.user_content_reflections
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_staff());
