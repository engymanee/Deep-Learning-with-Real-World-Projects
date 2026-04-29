-- 045_announcement_audiences.sql
--
-- Rebuilds the announcement audience model to match the four
-- curator-facing options:
--
--   1. Everyone              -> audience_scope = 'global'
--   2. Specific Cohort       -> audience_scope = 'cohort'
--                               cohort_codes  = subset of {A,B,C}
--   3. Specific School Team  -> audience_scope = 'school_team'
--                               school_team_ids = uuid[] referencing
--                               public.cohorts(id) (which actually
--                               stores school leadership teams)
--   4. Specific Fellow       -> audience_scope = 'users'
--                               user_ids = uuid[] referencing
--                               public.profiles(id)
--
-- Why text instead of an enum? `ALTER TYPE ... ADD VALUE` cannot
-- run inside a transaction block, which the migration runner uses.
-- Converting audience_scope to text + a CHECK constraint gives us
-- the same safety with frictionless future scope additions.

-- 1) Loosen the enum: convert the column to text and rebuild the
--    constraint so we can add 'school_team' and 'users' values.
alter table public.announcements
  alter column audience_scope type text using audience_scope::text;

alter table public.announcements
  drop constraint if exists announcements_audience_scope_check;
alter table public.announcements
  add constraint announcements_audience_scope_check
  check (audience_scope in ('global','cohort','school_team','users','year'));
-- 'year' kept in the allowed list only so existing rows survive
-- the migration; the UI no longer surfaces it and the backfill
-- below moves any year-scoped rows to 'global'.

-- 2) New multi-target columns. All nullable - they only carry a
--    value when their matching scope is selected.
alter table public.announcements
  add column if not exists cohort_codes    text[],
  add column if not exists school_team_ids uuid[],
  add column if not exists user_ids        uuid[];

-- Cohort codes are constrained to {A,B,C}.
alter table public.announcements
  drop constraint if exists announcements_cohort_codes_valid;
alter table public.announcements
  add constraint announcements_cohort_codes_valid
  check (
    cohort_codes is null
    or cohort_codes <@ array['A','B','C']::text[]
  );

-- 3) Backfill legacy rows.
--    3a) Old 'cohort' scope was actually pointing at a school team
--        via the single cohort_id FK. Move those rows to the new
--        'school_team' scope and copy the id into the array column.
update public.announcements
   set audience_scope  = 'school_team',
       school_team_ids = array[cohort_id]
 where audience_scope = 'cohort'
   and cohort_id is not null;

--    3b) Year-scoped announcements lose their audience entirely
--        (year-level targeting is gone). Demote to 'global' so the
--        message is preserved and visible to everyone. We zero out
--        year_id so no stale reference remains.
update public.announcements
   set audience_scope = 'global',
       year_id        = null
 where audience_scope = 'year';

-- 4) GIN indexes on the array columns so the dashboard's
--    audience-match queries stay fast as volume grows.
create index if not exists announcements_school_team_ids_idx
  on public.announcements using gin(school_team_ids)
  where school_team_ids is not null;
create index if not exists announcements_user_ids_idx
  on public.announcements using gin(user_ids)
  where user_ids is not null;
create index if not exists announcements_cohort_codes_idx
  on public.announcements using gin(cohort_codes)
  where cohort_codes is not null;

-- 5) RLS: replace the read policy so fellows only see announcements
--    whose audience matches them. Admins are governed by a separate
--    policy and are unaffected.
drop policy if exists announcements_visible_to_audience on public.announcements;
create policy announcements_visible_to_audience
  on public.announcements
  for select
  to authenticated
  using (
    -- Everyone
    audience_scope = 'global'
    -- Specific Cohort: my profiles.cohort is in the targeted set
    or (audience_scope = 'cohort'
        and cohort_codes is not null
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.cohort = any(cohort_codes)
        ))
    -- Specific School Team: I'm a member of one of the targeted teams
    or (audience_scope = 'school_team'
        and school_team_ids is not null
        and exists (
          select 1 from public.cohort_members cm
          where cm.profile_id = auth.uid()
            and cm.cohort_id = any(school_team_ids)
        ))
    -- Specific Fellow: my id is in the targeted set
    or (audience_scope = 'users'
        and user_ids is not null
        and auth.uid() = any(user_ids))
  );

comment on column public.announcements.cohort_codes is
  'Subset of A/B/C cohort codes (from profiles.cohort) targeted when audience_scope = ''cohort''.';
comment on column public.announcements.school_team_ids is
  'Array of cohorts.id (school leadership teams) targeted when audience_scope = ''school_team''.';
comment on column public.announcements.user_ids is
  'Array of profiles.id targeted when audience_scope = ''users''.';
