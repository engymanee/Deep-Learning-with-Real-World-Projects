-- Restructure curriculum to a flat phase -> content_item model.
--
-- Phases (table: years) keep their existing shape (title, description,
-- cohorts text[]). Content items (table: labs) gain category, resource
-- type, body, and url, and have their cohort gating made nullable so
-- admins can choose whether a content item inherits cohort access from
-- its phase, overrides with a different cohort list, or locks itself
-- from everyone (empty array).
--
-- Cohort access semantics on labs (i.e. content items):
--   cohorts IS NULL     -> inherit from parent phase
--   cohorts = '{}'      -> locked from every fellow
--   cohorts = '{A,...}' -> override; only listed cohorts get access
--
-- The wider access rule (spec section 10) is: a fellow sees a content
-- item only if BOTH the phase and the content item allow their cohort.
-- Inheritance is resolved client/server side; the DB just stores the
-- raw value.

-- 1) Categories enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_category') then
    create type content_category as enum (
      'before_lab',
      'during_lab',
      'after_lab',
      'general_resources',
      'wisdom_coaching',
      'community_of_practice'
    );
  end if;
end $$;

-- 2) Resource types enum
do $$
begin
  if not exists (select 1 from pg_type where typname = 'content_resource_type') then
    create type content_resource_type as enum (
      'reading',
      'video',
      'slide_deck',
      'pdf',
      'worksheet',
      'reflection_prompt',
      'survey',
      'external_link',
      'protocol',
      'companion_guide',
      'assignment',
      'other'
    );
  end if;
end $$;

-- 3) New columns on labs (= content items).
alter table public.labs
  add column if not exists category content_category,
  add column if not exists resource_type content_resource_type,
  add column if not exists body text,
  add column if not exists url text;

-- 4) Cohort access -> nullable, no default. NULL means "inherit phase".
alter table public.labs
  alter column cohorts drop not null,
  alter column cohorts drop default;

-- 5) Helpful indexes for the new admin/fellow queries.
create index if not exists labs_year_category_order_idx
  on public.labs (year_id, category, order_index);
