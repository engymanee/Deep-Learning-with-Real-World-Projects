-- =============================================================================
-- User Content Reflections — Row Level Security (SIMPLIFIED)
-- Reflections are readable by authenticated users based on visibility
-- =============================================================================

alter table public.user_content_reflections enable row level security;

-- Authenticated users can read public reflections
drop policy if exists "reflections read public" on public.user_content_reflections;
create policy "reflections read public" on public.user_content_reflections
  for select to authenticated using (visibility = 'public');

-- Authenticated users can read cohort reflections if they're staff or in the same cohort
drop policy if exists "reflections read cohort" on public.user_content_reflections;
create policy "reflections read cohort" on public.user_content_reflections
  for select to authenticated using (
    visibility = 'cohort' and public.is_staff()
  );

-- Authors can insert their own reflections
drop policy if exists "reflections author insert" on public.user_content_reflections;
create policy "reflections author insert" on public.user_content_reflections
  for insert to authenticated
  with check (profile_id = auth.uid());

-- Authors or staff can update reflections
drop policy if exists "reflections author update" on public.user_content_reflections;
create policy "reflections author update" on public.user_content_reflections
  for update to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid() or public.is_staff());

-- Authors or staff can delete reflections
drop policy if exists "reflections author delete" on public.user_content_reflections;
create policy "reflections author delete" on public.user_content_reflections
  for delete to authenticated
  using (profile_id = auth.uid() or public.is_staff());
