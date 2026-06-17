-- Fix Critical RLS Issues
-- Enables Row Level Security on tables that are currently exposed publicly

-- ============================================================================
-- page_blocks - Publicly editable content blocks
-- ============================================================================
alter table public.page_blocks enable row level security;

drop policy if exists "page_blocks read" on public.page_blocks;
create policy "page_blocks read" on public.page_blocks
  for select using (true);

drop policy if exists "page_blocks write staff" on public.page_blocks;
create policy "page_blocks write staff" on public.page_blocks
  for insert to authenticated with check (public.is_staff());

drop policy if exists "page_blocks update staff" on public.page_blocks;
create policy "page_blocks update staff" on public.page_blocks
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "page_blocks delete staff" on public.page_blocks;
create policy "page_blocks delete staff" on public.page_blocks
  for delete to authenticated using (public.is_staff());

-- ============================================================================
-- custom_pages - Admin-managed pages
-- ============================================================================
alter table public.custom_pages enable row level security;

drop policy if exists "custom_pages read" on public.custom_pages;
create policy "custom_pages read" on public.custom_pages
  for select using (true);

drop policy if exists "custom_pages write staff" on public.custom_pages;
create policy "custom_pages write staff" on public.custom_pages
  for insert to authenticated with check (public.is_staff());

drop policy if exists "custom_pages update staff" on public.custom_pages;
create policy "custom_pages update staff" on public.custom_pages
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "custom_pages delete staff" on public.custom_pages;
create policy "custom_pages delete staff" on public.custom_pages
  for delete to authenticated using (public.is_staff());

-- ============================================================================
-- page_images - Admin-managed page images
-- ============================================================================
alter table public.page_images enable row level security;

drop policy if exists "page_images read" on public.page_images;
create policy "page_images read" on public.page_images
  for select using (true);

drop policy if exists "page_images write staff" on public.page_images;
create policy "page_images write staff" on public.page_images
  for insert to authenticated with check (public.is_staff());

drop policy if exists "page_images update staff" on public.page_images;
create policy "page_images update staff" on public.page_images
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "page_images delete staff" on public.page_images;
create policy "page_images delete staff" on public.page_images
  for delete to authenticated using (public.is_staff());

-- ============================================================================
-- schedules - Curriculum schedules
-- ============================================================================
alter table public.schedules enable row level security;

drop policy if exists "schedules read" on public.schedules;
create policy "schedules read" on public.schedules
  for select to authenticated using (true);

drop policy if exists "schedules write staff" on public.schedules;
create policy "schedules write staff" on public.schedules
  for insert to authenticated with check (public.is_staff());

drop policy if exists "schedules update staff" on public.schedules;
create policy "schedules update staff" on public.schedules
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "schedules delete staff" on public.schedules;
create policy "schedules delete staff" on public.schedules
  for delete to authenticated using (public.is_staff());

-- ============================================================================
-- schedule_options - Options within schedules
-- ============================================================================
alter table public.schedule_options enable row level security;

drop policy if exists "schedule_options read" on public.schedule_options;
create policy "schedule_options read" on public.schedule_options
  for select to authenticated using (true);

drop policy if exists "schedule_options write staff" on public.schedule_options;
create policy "schedule_options write staff" on public.schedule_options
  for insert to authenticated with check (public.is_staff());

drop policy if exists "schedule_options update staff" on public.schedule_options;
create policy "schedule_options update staff" on public.schedule_options
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "schedule_options delete staff" on public.schedule_options;
create policy "schedule_options delete staff" on public.schedule_options
  for delete to authenticated using (public.is_staff());

-- ============================================================================
-- schedule_votes - User votes on schedule options
-- ============================================================================
alter table public.schedule_votes enable row level security;

drop policy if exists "schedule_votes read" on public.schedule_votes;
create policy "schedule_votes read" on public.schedule_votes
  for select to authenticated using (true);

drop policy if exists "schedule_votes write own" on public.schedule_votes;
create policy "schedule_votes write own" on public.schedule_votes
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "schedule_votes delete own" on public.schedule_votes;
create policy "schedule_votes delete own" on public.schedule_votes
  for delete to authenticated using (auth.uid() = user_id);
