-- Add scheduled_at to labs to power live-session countdown / auto-completion.
--
-- - resource_type = 'live_session' rows now carry a wall-clock start
--   time. Combined with duration_minutes (already present) we know
--   when the session is upcoming, live, or has ended.
-- - Non-live rows keep NULL.
-- - Existing live rows that have not been scheduled yet keep NULL
--   and the UI falls back to the current "Join now" button.
-- - The partial index supports cheap "next upcoming session" queries
--   on the dashboard without scanning every content row.
--
-- Idempotent. No data deleted.
alter table public.labs
  add column if not exists scheduled_at timestamptz;

comment on column public.labs.scheduled_at is
  'Wall-clock start time for live_session resource_type items. Combined with duration_minutes to compute when the session is upcoming, live, or ended. NULL for non-live items, or live items the admin has not yet scheduled.';

create index if not exists labs_scheduled_at_idx
  on public.labs (scheduled_at)
  where resource_type = 'live_session';
