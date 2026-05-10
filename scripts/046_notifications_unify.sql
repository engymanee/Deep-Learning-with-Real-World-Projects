-- 046_notifications_unify.sql
-- Unify announcements into a single `notifications` table that backs:
--   * announcements (existing data, audience-scoped)
--   * reminders (linked to a specific lab/module/session, with CTA)
--   * alerts (system-wide warnings)
-- Also adds scheduling, status tracking, email metadata, and a per-recipient
-- read/email-delivery log.

-- 1. Rename announcements -> notifications and bring forward all existing data.
alter table if exists public.announcements rename to notifications;

-- 2. Drop the old policies that referenced the previous table name. We will
-- recreate equivalents below now that audience scoping is shared.
drop policy if exists announcements_admin_write on public.notifications;
drop policy if exists announcements_visible_to_audience on public.notifications;

-- 3. Add new columns. All defaults are chosen so existing rows remain valid
-- announcements that have already been delivered.
alter table public.notifications
  add column if not exists kind text not null default 'announcement'
    check (kind in ('announcement', 'reminder', 'alert')),
  add column if not exists status text not null default 'sent'
    check (status in ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  add column if not exists scheduled_for timestamptz,
  add column if not exists sent_at timestamptz,
  add column if not exists cta_label text,
  add column if not exists cta_url text,
  add column if not exists lab_id text references public.labs(id) on delete set null,
  add column if not exists module_id text references public.modules(id) on delete set null,
  add column if not exists session_id uuid references public.sessions(id) on delete set null,
  add column if not exists email_enabled boolean not null default false,
  add column if not exists email_subject text;

-- Backfill sent_at for existing announcements so dispatch logic treats them as
-- already-delivered and never re-sends them.
update public.notifications
  set sent_at = coalesce(sent_at, published_at)
  where status = 'sent';

-- Helpful indexes for the surfaces we are about to build.
create index if not exists notifications_status_scheduled_idx
  on public.notifications (status, scheduled_for)
  where status in ('scheduled', 'sending');
create index if not exists notifications_published_idx
  on public.notifications (published_at desc);
create index if not exists notifications_kind_idx
  on public.notifications (kind);

-- 4. Recreate RLS policies on the renamed table.
alter table public.notifications enable row level security;

-- Admins can do anything.
create policy notifications_admin_write on public.notifications
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Fellows / facilitators only see notifications that have actually been sent
-- and whose audience includes them. Drafts and scheduled items stay invisible.
create policy notifications_visible_to_audience on public.notifications
  for select
  using (
    status = 'sent'
    and (
      audience_scope = 'global'
      or (
        audience_scope = 'cohort'
        and cohort_codes is not null
        and exists (
          select 1 from public.profiles p
          where p.id = auth.uid()
            and p.cohort = any (notifications.cohort_codes)
        )
      )
      or (
        audience_scope = 'school_team'
        and school_team_ids is not null
        and exists (
          select 1 from public.cohort_members cm
          where cm.profile_id = auth.uid()
            and cm.cohort_id = any (notifications.school_team_ids)
        )
      )
      or (
        audience_scope = 'users'
        and user_ids is not null
        and auth.uid() = any (user_ids)
      )
    )
  );

-- 5. Per-recipient delivery + read state. One row per (notification, profile),
-- written when a notification is dispatched.
create table if not exists public.notification_recipients (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  email text,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'skipped', 'sent', 'failed')),
  email_provider_id text,
  email_sent_at timestamptz,
  email_error text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (notification_id, profile_id)
);

create index if not exists notification_recipients_profile_idx
  on public.notification_recipients (profile_id, read_at);
create index if not exists notification_recipients_notification_idx
  on public.notification_recipients (notification_id);

alter table public.notification_recipients enable row level security;

create policy notification_recipients_self_read on public.notification_recipients
  for select using (profile_id = auth.uid());

create policy notification_recipients_self_update on public.notification_recipients
  for update using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

create policy notification_recipients_admin_all on public.notification_recipients
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- 6. Invitations. Tracks every fellow we invite (single or bulk) so admins can
-- see status, resend, or revoke. The actual auth user is created via Supabase
-- Admin API; we store the resulting auth.users.id in supabase_user_id once we
-- have it.
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  title text,
  role text not null default 'fellow' check (role in ('fellow', 'admin', 'facilitator')),
  cohort text,
  school_id uuid references public.schools(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'accepted', 'expired', 'revoked', 'failed')),
  invited_by uuid references public.profiles(id) on delete set null,
  invited_at timestamptz not null default now(),
  last_sent_at timestamptz,
  expires_at timestamptz,
  accepted_at timestamptz,
  supabase_user_id uuid,
  email_provider_id text,
  last_error text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create index if not exists invitations_status_idx on public.invitations (status);

alter table public.invitations enable row level security;

create policy invitations_admin_all on public.invitations
  for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
