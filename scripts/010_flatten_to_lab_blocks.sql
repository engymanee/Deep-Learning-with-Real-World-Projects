-- =============================================================================
-- 010_flatten_to_lab_blocks.sql
--
-- Flattens the curriculum data model.
--
-- Before: Year -> Lab -> Lesson -> Resource, each with its own progress table.
-- After:  Year -> Lab -> Content Block (typed, phased), with a single
--         user_block_completions join for progress.
--
-- Also renames Year Two from "Execution & Brokering" to "Wisdom Coaching"
-- and trims the module-prefixed lab titles in Years 2 and 3 to plain
-- "Lab N: Topic" (so the sidebar reads the same in every year).
--
-- This migration is destructive for the dropped tables (lessons, resources,
-- and their progress tables) but keeps labs, sessions, and user_lab_progress
-- intact.
-- =============================================================================

begin;

-- 1. Rename Year Two.
update public.years
   set title       = 'Year Two: Wisdom Coaching',
       description = 'Team coaching, implementation, and systems brokering - turn insight into shared practice.'
 where id = 'year-2';

-- 2. Normalize lab titles so every lab reads like "Lab N: Topic".
update public.labs set title = 'Lab 1: Take People Seriously as Persons' where id = 'lab-1';
update public.labs set title = 'Lab 2: Ground Your Compass'             where id = 'lab-2';
update public.labs set title = 'Lab 3: Follow the Trailheads'            where id = 'lab-3';
update public.labs set title = 'Lab 4: Navigate Challenges'              where id = 'lab-4';
update public.labs set title = 'Lab 5: Courageous Dialogue'              where id = 'lab-5';

update public.labs set title = 'Lab 1: Coaching Foundations'        where id = 'module-2-1';
update public.labs set title = 'Lab 2: Implementation Strategies'   where id = 'module-2-2';
update public.labs set title = 'Lab 3: Brokering Across Systems'    where id = 'module-2-3';
update public.labs set title = 'Lab 4: Collaborative Problem-Solving' where id = 'module-2-4';

update public.labs set title = 'Lab 1: Building Community'         where id = 'module-3-1';
update public.labs set title = 'Lab 2: Peer Learning & Mentoring'  where id = 'module-3-2';
update public.labs set title = 'Lab 3: Scaling & Sustainability'   where id = 'module-3-3';

-- 3. Drop lesson- and resource-scoped tables. CASCADE handles the
--    handful of FKs from reader_responses / learning_journal_entries /
--    reflection_survey_submissions that previously pointed at lessons.
drop table if exists public.user_resource_progress cascade;
drop table if exists public.user_lesson_progress  cascade;
drop table if exists public.resources             cascade;
drop table if exists public.lessons               cascade;

-- 4. Enum types for the new block model. Guarded so re-running is safe.
do $$ begin
  create type public.lab_phase as enum ('before', 'during', 'after');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.lab_block_type as enum (
    'reading',
    'video',
    'reflection_prompt',
    'protocol',
    'session_link',
    'slides',
    'survey',
    'follow_up_task'
  );
exception when duplicate_object then null; end $$;

-- 5. lab_content_blocks: a typed, ordered, phased piece of content on a lab.
create table if not exists public.lab_content_blocks (
  id               uuid primary key default gen_random_uuid(),
  lab_id           text not null references public.labs(id) on delete cascade,
  phase            public.lab_phase      not null,
  block_type       public.lab_block_type not null,
  order_index      int                   not null,
  title            text                  not null,
  body             text,                               -- markdown / plain text
  url              text,                               -- external link, video, pdf
  duration_minutes int,                                -- estimated time
  is_optional      boolean not null default false,
  session_id       uuid references public.sessions(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lab_content_blocks_lab_phase_idx
  on public.lab_content_blocks (lab_id, phase, order_index);

-- 6. user_block_completions: one row per (user, block) when they mark it done.
create table if not exists public.user_block_completions (
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  block_id     uuid not null references public.lab_content_blocks(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (profile_id, block_id)
);

create index if not exists user_block_completions_profile_idx
  on public.user_block_completions (profile_id);

-- 7. Row-level security.
alter table public.lab_content_blocks     enable row level security;
alter table public.user_block_completions enable row level security;

-- Blocks are visible to every signed-in user; only admins write.
drop policy if exists "lab_content_blocks_select_all"          on public.lab_content_blocks;
drop policy if exists "lab_content_blocks_admin_write"         on public.lab_content_blocks;
create policy "lab_content_blocks_select_all"
  on public.lab_content_blocks for select
  using (auth.role() = 'authenticated');
create policy "lab_content_blocks_admin_write"
  on public.lab_content_blocks for all
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

-- Users manage only their own completions; facilitators and admins can read.
drop policy if exists "user_block_completions_self_select" on public.user_block_completions;
drop policy if exists "user_block_completions_self_write"  on public.user_block_completions;
drop policy if exists "user_block_completions_staff_read"  on public.user_block_completions;

create policy "user_block_completions_self_select"
  on public.user_block_completions for select
  using (auth.uid() = profile_id);

create policy "user_block_completions_self_write"
  on public.user_block_completions for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "user_block_completions_staff_read"
  on public.user_block_completions for select
  using (
    exists (
      select 1 from public.profiles p
       where p.id = auth.uid() and p.role in ('admin','facilitator')
    )
  );

-- 8. Keep updated_at fresh on blocks.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists lab_content_blocks_touch_updated_at on public.lab_content_blocks;
create trigger lab_content_blocks_touch_updated_at
  before update on public.lab_content_blocks
  for each row execute function public.set_updated_at();

commit;
