-- 044_announcement_content_reminder.sql
--
-- Adds optional curriculum-content reference to announcements so admins
-- can post a reminder that links straight to a specific lab/lesson, and
-- defensively backstops `published_at` with `now()` so missing-default
-- inserts can never quietly fail with a NOT NULL violation.
--
-- - `content_id` references `public.labs(id)` (text PK), nullable, with
--   `on delete set null` so deleting a lab doesn't cascade and remove
--   the announcement; we just lose the reminder link.
-- - The column is intentionally a free-text FK rather than a join table
--   because each announcement reminds about at most one piece of content.
-- - `published_at` already exists; we set a default but do not change
--   nullability or backfill anything.

alter table public.announcements
  add column if not exists content_id text
    references public.labs(id) on delete set null;

create index if not exists announcements_content_idx
  on public.announcements(content_id)
  where content_id is not null;

alter table public.announcements
  alter column published_at set default now();

comment on column public.announcements.content_id is
  'Optional reference to a lab/content item the announcement reminds learners about. Renders as an inline link on the dashboard feed.';
