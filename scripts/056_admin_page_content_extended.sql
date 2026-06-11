-- =============================================================================
-- Admin Page Editable Content - Extended with Block Types
-- Adds new columns for block type support (text, image, text+image)
-- =============================================================================

-- Add block_type column if it doesn't exist
alter table public.admin_page_content
add column if not exists block_type text default 'text' not null;

-- Add image support columns if they don't exist
alter table public.admin_page_content
add column if not exists image_url text;

alter table public.admin_page_content
add column if not exists image_alt text;

-- Create index for block_type if it doesn't exist
create index if not exists admin_page_content_type_idx on public.admin_page_content(block_type);

-- Ensure RLS is enabled
alter table public.admin_page_content enable row level security;

-- Drop and recreate policies to ensure they're up to date
drop policy if exists "Admins can read admin page content" on public.admin_page_content;
create policy "Admins can read admin page content" on public.admin_page_content
  for select
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can create admin page content" on public.admin_page_content;
create policy "Admins can create admin page content" on public.admin_page_content
  for insert
  to authenticated
  with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can update admin page content" on public.admin_page_content;
create policy "Admins can update admin page content" on public.admin_page_content
  for update
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  )
  with check (
    (select role from profiles where id = auth.uid()) = 'admin'
  );

drop policy if exists "Admins can delete admin page content" on public.admin_page_content;
create policy "Admins can delete admin page content" on public.admin_page_content
  for delete
  to authenticated
  using (
    (select role from profiles where id = auth.uid()) = 'admin'
  );
