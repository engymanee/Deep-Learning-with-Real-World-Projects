-- =============================================================================
-- Portal Maintenance Audit Log
-- Tracks all admin cleanup actions for accountability and review
-- =============================================================================

create table if not exists public.maintenance_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_id    uuid not null references public.profiles(id) on delete restrict,
  action_type text not null,
  -- Action types: archive, delete, restore, unpublish, publish, resend_invite, etc.
  item_type   text not null,
  -- Item types: user, invitation, phase, lab, activity, resource, reflection, comment, win, ask, notification, custom_page
  item_id     text,
  -- ID of the affected item
  item_name   text,
  -- Human-readable name/title/email for reference
  details     jsonb,
  -- Additional context stored as JSON (reason, old values, etc.)
  created_at  timestamptz not null default now()
);

create index if not exists maintenance_audit_admin_idx on public.maintenance_audit_log(admin_id, created_at desc);
create index if not exists maintenance_audit_action_idx on public.maintenance_audit_log(action_type, created_at desc);
create index if not exists maintenance_audit_item_idx on public.maintenance_audit_log(item_type, item_id);
create index if not exists maintenance_audit_created_idx on public.maintenance_audit_log(created_at desc);

-- =============================================================================
-- Maintenance Log RLS Policies
-- =============================================================================

alter table public.maintenance_audit_log enable row level security;

-- Only admins can view the maintenance audit log
create policy "Admins can view maintenance logs" on public.maintenance_audit_log
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can insert maintenance logs" on public.maintenance_audit_log
  for insert
  with check (
    admin_id = auth.uid() and
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
