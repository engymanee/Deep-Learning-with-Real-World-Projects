-- 048_notification_recipients_dismissed.sql
-- Adds a "dismissed" timestamp to notification_recipients so a fellow
-- can clear an item from their personal feed without changing whether
-- the notification is considered read for any other purpose.
--
-- Dismissals are per-user. The underlying notification row is
-- untouched, so admins still see full delivery + read stats. Other
-- fellows in the same audience also see the notification normally.
--
-- Already applied via the v0 Supabase MCP migration of the same name;
-- this file exists for source-control parity with scripts/.

alter table public.notification_recipients
  add column if not exists dismissed_at timestamptz;

create index if not exists notification_recipients_active_idx
  on public.notification_recipients (profile_id, dismissed_at);
