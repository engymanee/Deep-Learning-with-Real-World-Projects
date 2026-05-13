-- =============================================================================
-- Custom Pages Feature
-- Stores admin-created custom pages with block-based content and images
-- =============================================================================

-- Custom Pages table
create table if not exists public.custom_pages (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  slug        text not null unique,
  description text,
  is_published boolean not null default false,
  created_by  uuid not null references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists custom_pages_slug_idx on public.custom_pages(slug);
create index if not exists custom_pages_created_by_idx on public.custom_pages(created_by);
create index if not exists custom_pages_published_idx on public.custom_pages(is_published);

-- Page blocks (text, image, or combined)
create table if not exists public.page_blocks (
  id          uuid primary key default gen_random_uuid(),
  page_id     uuid not null references public.custom_pages(id) on delete cascade,
  block_type  text not null check (block_type in ('text', 'image', 'combined')),
  order_number int not null,
  title       text,
  content     text,
  image_id    uuid references public.page_images(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (page_id, order_number)
);

create index if not exists page_blocks_page_idx on public.page_blocks(page_id);
create index if not exists page_blocks_image_idx on public.page_blocks(image_id);

-- Page images (managed asset library)
create table if not exists public.page_images (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  filename    text not null,
  size_bytes  int not null,
  mime_type   text not null,
  width       int,
  height      int,
  alt_text    text,
  uploaded_by uuid not null references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists page_images_uploaded_by_idx on public.page_images(uploaded_by);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

alter table public.custom_pages enable row level security;
alter table public.page_blocks enable row level security;
alter table public.page_images enable row level security;

-- Custom Pages: Admins can create/edit, everyone can view published pages
create policy "Admins can manage custom pages" on public.custom_pages
  using (auth.uid() = created_by or (select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Everyone can view published custom pages" on public.custom_pages
  for select using (is_published = true or (select role from public.profiles where id = auth.uid()) = 'admin');

-- Page Blocks: Admins can manage, everyone can view if page is published
create policy "Admins can manage page blocks" on public.page_blocks
  using ((select (select role from public.profiles where id = auth.uid()) = 'admin') or
         (select created_by from public.custom_pages where id = page_id) = auth.uid())
  with check ((select (select role from public.profiles where id = auth.uid()) = 'admin'));

create policy "Everyone can view blocks of published pages" on public.page_blocks
  for select using ((select is_published from public.custom_pages where id = page_id) = true or
                   (select (select role from public.profiles where id = auth.uid()) = 'admin'));

-- Page Images: Admins can manage and upload
create policy "Admins can manage page images" on public.page_images
  using ((select role from public.profiles where id = auth.uid()) = 'admin')
  with check ((select role from public.profiles where id = auth.uid()) = 'admin');

create policy "Everyone can view page images" on public.page_images
  for select using (true);
