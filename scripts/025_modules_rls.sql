-- =============================================================================
-- WAW Program — Row Level Security for Modules Table
-- Modules are curriculum content, readable by all authenticated users
-- Writable by staff only
-- =============================================================================

alter table public.modules enable row level security;

drop policy if exists "curriculum read" on public.modules;
create policy "curriculum read" on public.modules
  for select to authenticated using (true);

drop policy if exists "curriculum write staff" on public.modules;
create policy "curriculum write staff" on public.modules
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
