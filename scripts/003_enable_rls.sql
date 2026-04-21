-- =============================================================================
-- WAW Program — Row Level Security
-- Learners can only read/write their own progress + journal.
-- Curriculum tables are readable by all authenticated users.
-- Cohort data is readable to cohort members; facilitators/admins have broader
-- access (enforced in helper function is_staff()).
-- =============================================================================

-- Helper: is the current user a facilitator/admin?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('facilitator','admin')
  );
$$;

-- Helper: is the current user a member of the given cohort?
create or replace function public.is_cohort_member(p_cohort uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.cohort_members
    where cohort_id = p_cohort and profile_id = auth.uid()
  );
$$;

-- -----------------------------------------------------------------------------
-- Enable RLS
-- -----------------------------------------------------------------------------
alter table public.schools                        enable row level security;
alter table public.cohorts                        enable row level security;
alter table public.profiles                       enable row level security;
alter table public.cohort_members                 enable row level security;
alter table public.years                          enable row level security;
alter table public.labs                           enable row level security;
alter table public.lessons                        enable row level security;
alter table public.resources                      enable row level security;
alter table public.user_year_progress             enable row level security;
alter table public.user_lab_progress              enable row level security;
alter table public.user_lesson_progress           enable row level security;
alter table public.user_resource_progress         enable row level security;
alter table public.reflection_survey_submissions  enable row level security;
alter table public.reader_responses               enable row level security;
alter table public.learning_journal_entries       enable row level security;
alter table public.discussion_posts               enable row level security;
alter table public.sessions                       enable row level security;
alter table public.session_facilitators           enable row level security;
alter table public.session_attendance             enable row level security;

-- -----------------------------------------------------------------------------
-- CURRICULUM: readable by everyone authenticated; writable by staff
-- -----------------------------------------------------------------------------

drop policy if exists "curriculum read" on public.years;
create policy "curriculum read" on public.years
  for select to authenticated using (true);

drop policy if exists "curriculum read" on public.labs;
create policy "curriculum read" on public.labs
  for select to authenticated using (true);

drop policy if exists "curriculum read" on public.lessons;
create policy "curriculum read" on public.lessons
  for select to authenticated using (true);

drop policy if exists "curriculum read" on public.resources;
create policy "curriculum read" on public.resources
  for select to authenticated using (true);

drop policy if exists "curriculum write staff" on public.years;
create policy "curriculum write staff" on public.years
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "curriculum write staff" on public.labs;
create policy "curriculum write staff" on public.labs
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "curriculum write staff" on public.lessons;
create policy "curriculum write staff" on public.lessons
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "curriculum write staff" on public.resources;
create policy "curriculum write staff" on public.resources
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- SCHOOLS & COHORTS
-- -----------------------------------------------------------------------------

drop policy if exists "schools read" on public.schools;
create policy "schools read" on public.schools
  for select to authenticated using (true);

drop policy if exists "schools staff write" on public.schools;
create policy "schools staff write" on public.schools
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "cohorts read member" on public.cohorts;
create policy "cohorts read member" on public.cohorts
  for select to authenticated
  using (public.is_staff() or public.is_cohort_member(id));

drop policy if exists "cohorts staff write" on public.cohorts;
create policy "cohorts staff write" on public.cohorts
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "cohort_members read" on public.cohort_members;
create policy "cohort_members read" on public.cohort_members
  for select to authenticated
  using (public.is_staff() or public.is_cohort_member(cohort_id));

drop policy if exists "cohort_members staff write" on public.cohort_members;
create policy "cohort_members staff write" on public.cohort_members
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- -----------------------------------------------------------------------------
-- PROFILES
-- -----------------------------------------------------------------------------

drop policy if exists "profiles read self + cohort" on public.profiles;
create policy "profiles read self + cohort" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or public.is_staff()
    or exists (
      select 1
      from public.cohort_members my, public.cohort_members them
      where my.profile_id = auth.uid()
        and them.profile_id = public.profiles.id
        and my.cohort_id = them.cohort_id
    )
  );

drop policy if exists "profiles update self" on public.profiles;
create policy "profiles update self" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles insert self" on public.profiles;
create policy "profiles insert self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- PROGRESS TABLES: owner-only
-- -----------------------------------------------------------------------------

drop policy if exists "progress owner" on public.user_year_progress;
create policy "progress owner" on public.user_year_progress
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "progress owner" on public.user_lab_progress;
create policy "progress owner" on public.user_lab_progress
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "progress owner" on public.user_lesson_progress;
create policy "progress owner" on public.user_lesson_progress
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "progress owner" on public.user_resource_progress;
create policy "progress owner" on public.user_resource_progress
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "survey owner" on public.reflection_survey_submissions;
create policy "survey owner" on public.reflection_survey_submissions
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "reader response owner" on public.reader_responses;
create policy "reader response owner" on public.reader_responses
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

drop policy if exists "journal owner" on public.learning_journal_entries;
create policy "journal owner" on public.learning_journal_entries
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());

-- -----------------------------------------------------------------------------
-- DISCUSSIONS: cohort-scoped
-- -----------------------------------------------------------------------------

drop policy if exists "discussions read cohort" on public.discussion_posts;
create policy "discussions read cohort" on public.discussion_posts
  for select to authenticated
  using (public.is_staff() or public.is_cohort_member(cohort_id));

drop policy if exists "discussions author insert" on public.discussion_posts;
create policy "discussions author insert" on public.discussion_posts
  for insert to authenticated
  with check (author_id = auth.uid() and public.is_cohort_member(cohort_id));

drop policy if exists "discussions author update" on public.discussion_posts;
create policy "discussions author update" on public.discussion_posts
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

drop policy if exists "discussions author delete" on public.discussion_posts;
create policy "discussions author delete" on public.discussion_posts
  for delete to authenticated
  using (author_id = auth.uid() or public.is_staff());

-- -----------------------------------------------------------------------------
-- SESSIONS: cohort-scoped
-- -----------------------------------------------------------------------------

drop policy if exists "sessions read cohort" on public.sessions;
create policy "sessions read cohort" on public.sessions
  for select to authenticated
  using (public.is_staff() or cohort_id is null or public.is_cohort_member(cohort_id));

drop policy if exists "sessions staff write" on public.sessions;
create policy "sessions staff write" on public.sessions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "session facilitators read" on public.session_facilitators;
create policy "session facilitators read" on public.session_facilitators
  for select to authenticated using (true);

drop policy if exists "session facilitators staff write" on public.session_facilitators;
create policy "session facilitators staff write" on public.session_facilitators
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "session attendance self" on public.session_attendance;
create policy "session attendance self" on public.session_attendance
  for all to authenticated
  using (profile_id = auth.uid() or public.is_staff())
  with check (profile_id = auth.uid());
