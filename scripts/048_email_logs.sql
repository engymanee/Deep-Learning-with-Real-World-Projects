-- 048_email_logs.sql
-- Track all emails sent by the system for admin visibility and debugging

create table if not exists public.email_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  recipient_name text,
  subject text not null,
  email_type text not null, -- 'invitation', 'notification', 'scheduling', etc
  status text not null default 'pending', -- 'pending', 'sent', 'failed', 'bounced'
  resend_id text, -- ID returned from Resend API
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  metadata jsonb -- Additional context like notification_id, schedule_id, etc
);

create index if not exists email_logs_created_at_idx
  on public.email_logs (created_at desc);

create index if not exists email_logs_status_idx
  on public.email_logs (status);

create index if not exists email_logs_email_type_idx
  on public.email_logs (email_type);

create index if not exists email_logs_recipient_email_idx
  on public.email_logs (recipient_email);

-- Enable RLS
alter table public.email_logs enable row level security;

-- Only admins can view email logs
create policy "Admins can view all email logs" on public.email_logs
  for select
  to authenticated
  using (
    (select role from auth.users where id = auth.uid()) = 'admin'
  );
