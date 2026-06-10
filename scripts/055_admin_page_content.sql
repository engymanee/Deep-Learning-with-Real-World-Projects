-- =============================================================================
-- Admin Page Editable Content Slots
-- Allows admins to add editable text blocks to built-in admin pages
-- =============================================================================

create table if not exists public.admin_page_content (
  id            uuid primary key default gen_random_uuid(),
  page_id       text not null,  -- 'admin', 'admin/curriculum', etc.
  slot_name     text not null,  -- 'top', 'bottom', 'header', etc.
  order_index   smallint not null default 0,
  title         text,
  content       text not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (page_id, slot_name, order_index)
);

create index if not exists admin_page_content_page_slot_idx on public.admin_page_content(page_id, slot_name);
create index if not exists admin_page_content_order_idx on public.admin_page_content(page_id, slot_name, order_index);

-- Enable RLS
alter table public.admin_page_content enable row level security;

-- Admin only: can read all content
create policy "Admins can read admin page content" on public.admin_page_content
  for select
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Admin only: can create content
create policy "Admins can create admin page content" on public.admin_page_content
  for insert
  to authenticated
  with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Admin only: can update content
create policy "Admins can update admin page content" on public.admin_page_content
  for update
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

-- Admin only: can delete content
create policy "Admins can delete admin page content" on public.admin_page_content
  for delete
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
