-- =============================================================================
-- WAW Program — Core Schema
-- Creates all tables that back the Wisdom At Work learner dashboard.
-- Safe to run multiple times (uses IF NOT EXISTS / IF EXISTS guards).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (schools + cohorts)
-- -----------------------------------------------------------------------------

create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

create table if not exists public.cohorts (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  name          text not null,
  current_year  smallint not null default 1 check (current_year between 1 and 3),
  created_at    timestamptz not null default now()
);

create index if not exists cohorts_school_idx on public.cohorts(school_id);

-- -----------------------------------------------------------------------------
-- 2. PROFILES (extends auth.users)
-- -----------------------------------------------------------------------------

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  email        text,
  title        text,
  avatar_url   text,
  role         text not null default 'learner'
               check (role in ('learner', 'facilitator', 'admin')),
  school_id    uuid references public.schools(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists profiles_school_idx on public.profiles(school_id);

create table if not exists public.cohort_members (
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  primary key (cohort_id, profile_id)
);

-- -----------------------------------------------------------------------------
-- 3. CURRICULUM (years → labs → lessons → resources)
-- -----------------------------------------------------------------------------

create table if not exists public.years (
  id           text primary key,
  order_index  smallint not null,
  title        text not null,
  description  text,
  created_at   timestamptz not null default now()
);

create table if not exists public.labs (
  id             text primary key,
  year_id        text not null references public.years(id) on delete cascade,
  order_index    smallint not null,
  title          text not null,
  subtitle       text,
  description    text,
  scheduled_date date,
  is_lab         boolean not null default true,
  created_at     timestamptz not null default now()
);

create index if not exists labs_year_idx on public.labs(year_id);

create table if not exists public.lessons (
  id                       text primary key,
  lab_id                   text not null references public.labs(id) on delete cascade,
  order_index              smallint not null,
  title                    text not null,
  description              text,
  learning_journal_prompt  text,
  discussion_prompt        text,
  reflection_survey_url    text,
  created_at               timestamptz not null default now()
);

create index if not exists lessons_lab_idx on public.lessons(lab_id);

create table if not exists public.resources (
  id                text primary key,
  lesson_id         text not null references public.lessons(id) on delete cascade,
  order_index       smallint not null default 0,
  title             text not null,
  resource_type     text not null
                    check (resource_type in ('video','audio','pdf','reading','external_link')),
  url               text not null,
  authors           text[] not null default '{}',
  publication_year  smallint,
  duration_minutes  smallint,
  has_audio         boolean not null default false,
  favicon           text,
  is_optional       boolean not null default false,
  is_post_lab       boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists resources_lesson_idx on public.resources(lesson_id);
create index if not exists resources_post_lab_idx on public.resources(lesson_id, is_post_lab);

-- -----------------------------------------------------------------------------
-- 4. PROGRESS TRACKING (per learner)
-- -----------------------------------------------------------------------------

create table if not exists public.user_year_progress (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  year_id       text not null references public.years(id)    on delete cascade,
  status        text not null default 'locked'
                check (status in ('locked','not_started','in_progress','complete')),
  progress      smallint not null default 0 check (progress between 0 and 100),
  unlocked_at   timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (profile_id, year_id)
);

create table if not exists public.user_lab_progress (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  lab_id        text not null references public.labs(id)     on delete cascade,
  status        text not null default 'not_started'
                check (status in ('locked','not_started','in_progress','complete')),
  progress      smallint not null default 0 check (progress between 0 and 100),
  started_at    timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (profile_id, lab_id)
);

create table if not exists public.user_lesson_progress (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  lesson_id     text not null references public.lessons(id)  on delete cascade,
  status        text not null default 'not_started'
                check (status in ('locked','not_started','in_progress','complete')),
  started_at    timestamptz,
  completed_at  timestamptz,
  updated_at    timestamptz not null default now(),
  primary key (profile_id, lesson_id)
);

create table if not exists public.user_resource_progress (
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  resource_id   text not null references public.resources(id) on delete cascade,
  completed     boolean not null default false,
  completed_at  timestamptz,
  primary key (profile_id, resource_id)
);

-- -----------------------------------------------------------------------------
-- 5. LAB STEP SUBMISSIONS (Steps 1-3)
-- -----------------------------------------------------------------------------

create table if not exists public.reflection_survey_submissions (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid not null references public.profiles(id) on delete cascade,
  lesson_id     text not null references public.lessons(id)  on delete cascade,
  submitted_at  timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

create table if not exists public.reader_responses (
  id                uuid primary key default gen_random_uuid(),
  profile_id        uuid not null references public.profiles(id) on delete cascade,
  lesson_id         text not null references public.lessons(id)  on delete cascade,
  passage_or_quote  text,
  content           text not null default '',
  submitted_at      timestamptz,
  updated_at        timestamptz not null default now(),
  unique (profile_id, lesson_id)
);

-- -----------------------------------------------------------------------------
-- 6. LEARNING JOURNAL
-- -----------------------------------------------------------------------------

create table if not exists public.learning_journal_entries (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  lesson_id    text references public.lessons(id) on delete set null,
  title        text,
  content      text not null default '',
  is_private   boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists journal_profile_idx on public.learning_journal_entries(profile_id);
create index if not exists journal_lesson_idx  on public.learning_journal_entries(lesson_id);

-- -----------------------------------------------------------------------------
-- 7. COHORT DISCUSSION THREADS
-- -----------------------------------------------------------------------------

create table if not exists public.discussion_posts (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  lesson_id   text references public.lessons(id) on delete set null,
  author_id   uuid not null references public.profiles(id) on delete cascade,
  parent_id   uuid references public.discussion_posts(id) on delete cascade,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists discussion_cohort_idx on public.discussion_posts(cohort_id, created_at desc);
create index if not exists discussion_lesson_idx on public.discussion_posts(lesson_id);
create index if not exists discussion_parent_idx on public.discussion_posts(parent_id);

-- -----------------------------------------------------------------------------
-- 8. SESSIONS / EVENTS
-- -----------------------------------------------------------------------------

create table if not exists public.sessions (
  id            uuid primary key default gen_random_uuid(),
  cohort_id     uuid references public.cohorts(id) on delete cascade,
  lab_id        text references public.labs(id) on delete set null,
  title         text not null,
  description   text,
  session_type  text not null default 'office_hours'
                check (session_type in ('office_hours','lab','listening_session','workshop')),
  starts_at     timestamptz not null,
  ends_at       timestamptz,
  zoom_link     text,
  created_at    timestamptz not null default now()
);

create index if not exists sessions_cohort_idx on public.sessions(cohort_id, starts_at);

create table if not exists public.session_facilitators (
  session_id  uuid not null references public.sessions(id)  on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  primary key (session_id, profile_id)
);

create table if not exists public.session_attendance (
  session_id  uuid not null references public.sessions(id)  on delete cascade,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  joined_at   timestamptz not null default now(),
  left_at     timestamptz,
  primary key (session_id, profile_id)
);
