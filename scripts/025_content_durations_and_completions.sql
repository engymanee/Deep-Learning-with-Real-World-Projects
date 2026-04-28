-- Add an optional duration display for content items, and a per-user
-- completion tracking table so fellows can mark content items as
-- complete from the curriculum view.
--
-- Why a fresh table instead of repurposing user_block_completions:
-- the legacy table keys on a uuid block_id, but our content items
-- (labs.id) are TEXT (gen_random_uuid()::text). Mixing the two would
-- require an intrusive type change and we'd lose the FK guarantee.

alter table public.labs
  add column if not exists duration_minutes integer
    check (duration_minutes is null or duration_minutes >= 0);

create table if not exists public.user_content_completions (
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  content_id   text not null references public.labs(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (profile_id, content_id)
);

create index if not exists user_content_completions_profile_idx
  on public.user_content_completions (profile_id);

create index if not exists user_content_completions_content_idx
  on public.user_content_completions (content_id);

-- RLS: each user manages only their own completion rows. Server
-- actions also enforce auth before writing, but RLS gives us
-- defence-in-depth when the client talks to PostgREST directly.
alter table public.user_content_completions enable row level security;

drop policy if exists "Users select own completions"
  on public.user_content_completions;
drop policy if exists "Users insert own completions"
  on public.user_content_completions;
drop policy if exists "Users delete own completions"
  on public.user_content_completions;

create policy "Users select own completions"
  on public.user_content_completions for select
  using (profile_id = auth.uid());

create policy "Users insert own completions"
  on public.user_content_completions for insert
  with check (profile_id = auth.uid());

create policy "Users delete own completions"
  on public.user_content_completions for delete
  using (profile_id = auth.uid());
