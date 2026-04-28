-- Cohort gating
-- -----------------------------------------------------------------------------
-- Introduces a user-level "Cohort" (A / B / C) that is distinct from the
-- existing `cohorts` table (which is now reframed in the UI as "School
-- Team"). Phases (`years`) and items (`labs`) can be gated to specific
-- cohorts: an empty `cohorts` array means "open to every cohort" (the
-- default, so existing data stays visible), while a non-empty array means
-- "only visible to fellows whose profile.cohort is in this list". Admins
-- and facilitators bypass the filter in application code.
--
-- This migration is intentionally additive and backwards-compatible: no
-- existing row is rewritten and every column is nullable or defaults to
-- an empty array.

-- -----------------------------------------------------------------------------
-- profiles.cohort
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists cohort text
    check (cohort in ('A', 'B', 'C'));

comment on column public.profiles.cohort is
  'High-level cohort label (A, B, or C) used to gate curriculum visibility. Distinct from cohort_members, which tracks the fellow''s School Team.';

-- -----------------------------------------------------------------------------
-- years.cohorts  (text[], default empty = open to all)
-- -----------------------------------------------------------------------------
alter table public.years
  add column if not exists cohorts text[] not null default '{}';

-- Defensive: ensure every entry is one of A/B/C. We use a CHECK on the
-- whole array with a subquery-style guard that rejects rogue values.
alter table public.years
  drop constraint if exists years_cohorts_valid;
alter table public.years
  add constraint years_cohorts_valid check (
    cohorts <@ array['A','B','C']::text[]
  );

comment on column public.years.cohorts is
  'Cohort access list. Empty array = open to every cohort. Non-empty = only fellows whose profile.cohort is in the list may see this phase.';

-- -----------------------------------------------------------------------------
-- labs.cohorts  (text[], default empty = open to all)
-- -----------------------------------------------------------------------------
alter table public.labs
  add column if not exists cohorts text[] not null default '{}';

alter table public.labs
  drop constraint if exists labs_cohorts_valid;
alter table public.labs
  add constraint labs_cohorts_valid check (
    cohorts <@ array['A','B','C']::text[]
  );

comment on column public.labs.cohorts is
  'Cohort access list for this item. Empty = open to every cohort. Non-empty = restricted to listed cohorts.';
