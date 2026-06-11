-- =============================================================================
-- Admin Page Editable Content - Extended with Block Types
-- Allows admins to add flexible content blocks (text, image, text+image) to pages
-- =============================================================================

-- Drop old table and constraints if migrating (optional)
-- drop table if exists public.admin_page_content cascade;

-- Create/update table with block_type support
create table if not exists public.admin_page_content (
  id            uuid primary key default gen_random_uuid(),
  page_id       text not null,  -- 'about', 'admin', etc.
  slot_name     text not null,  -- 'header', 'footer', 'body' for unified layout
  order_index   smallint not null default 0,
  block_type    text not null default 'text', -- 'text', 'image', 'text_image'
  title         text,
  content       text not null,  -- For text blocks: the text content
  image_url     text,           -- For image blocks: the image URL
  image_alt     text,           -- For image blocks: alt text
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (page_id, slot_name, order_index)
);

create index if not exists admin_page_content_page_slot_idx on public.admin_page_content(page_id, slot_name);
create index if not exists admin_page_content_order_idx on public.admin_page_content(page_id, slot_name, order_index);
create index if not exists admin_page_content_type_idx on public.admin_page_content(block_type);

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
