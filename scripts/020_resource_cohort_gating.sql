-- Cohort gating for the Library
-- Adds a `cohorts text[]` column to community_resources matching the
-- pattern already used on years/labs in migration 019:
--   - empty array  = available to every cohort (default, backwards-compatible)
--   - non-empty    = only fellows whose profile.cohort is in the list see it
-- Admins and facilitators bypass the filter in app code.

alter table public.community_resources
  add column if not exists cohorts text[] not null default '{}';

alter table public.community_resources
  drop constraint if exists community_resources_cohorts_valid;
alter table public.community_resources
  add constraint community_resources_cohorts_valid check (
    cohorts <@ array['A','B','C']::text[]
  );

comment on column public.community_resources.cohorts is
  'Cohort access list. Empty = available to all cohorts. Non-empty = only listed cohorts see the resource.';
