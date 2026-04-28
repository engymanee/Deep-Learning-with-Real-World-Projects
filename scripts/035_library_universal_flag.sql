-- Add the universal ("Further Reading") flag to the library.
-- When true: visible to everyone regardless of cohort - rendered
--            on the Further Reading tab.
-- When false (default): cohort-gated; visibility is computed against
--            the user's cohort using cumulative access (a fellow in
--            B sees A + B; a fellow in C sees A + B + C).
alter table public.community_resources
  add column if not exists is_universal boolean not null default false;

-- Partial index for the Further Reading tab. Universal rows are
-- typically a small slice of the table, so a partial index over
-- created_at is significantly cheaper than indexing the full
-- predicate.
create index if not exists community_resources_universal_recent_idx
  on public.community_resources (created_at desc)
  where is_universal = true;

comment on column public.community_resources.is_universal is
  'Library tab routing: true = Further Reading (visible to everyone), false = My Resources (cohort-gated).';
