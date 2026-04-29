-- Library: extend community_resources to power the new /resources page.
--
-- The current schema has: id, title, description, url, category (text),
-- cohorts (text[]) and timestamps. The redesigned Library card needs
-- two new structured fields:
--
--   resource_type   document | video | link | reading
--                   - drives the lucide icon on the card
--                   - constrains the filter dropdown
--
--   tags text[]     free-form chips shown on each card and used in
--                   the Tag filter dropdown
--
-- Cohort gating already lives on `cohorts text[]` (migration 020):
--   empty array  = "Further Reading" / universal
--   non-empty    = "My Resources" / cohort-gated (cumulative in app code)
--
-- The legacy `category` column is left in place for backwards compat
-- with /admin/community's older form; nothing reads it on the new
-- Library page.

alter table public.community_resources
  add column if not exists resource_type text not null default 'reading';

alter table public.community_resources
  drop constraint if exists community_resources_resource_type_valid;
alter table public.community_resources
  add constraint community_resources_resource_type_valid
    check (resource_type in ('document', 'video', 'link', 'reading'));

alter table public.community_resources
  add column if not exists tags text[] not null default '{}';

create index if not exists community_resources_resource_type_idx
  on public.community_resources (resource_type);

comment on column public.community_resources.resource_type is
  'Library card type: document | video | link | reading. Drives the icon.';
comment on column public.community_resources.tags is
  'Free-form tags rendered as chips and used by the Library filter.';
