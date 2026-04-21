-- =============================================================================
-- WAW Program — Demo Cohort Seed
-- Creates Lincoln High School + Lincoln High Leadership Team cohort + one
-- Office Hours session. Does NOT create auth users (those come from signup).
-- Idempotent via stable UUIDs.
-- =============================================================================

-- Lincoln High School
insert into public.schools (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'Lincoln High School')
on conflict (id) do update set name = excluded.name;

-- Lincoln High Leadership Team cohort
insert into public.cohorts (id, school_id, name, current_year) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111',
   'Lincoln High Leadership Team',
   1)
on conflict (id) do update
  set school_id    = excluded.school_id,
      name         = excluded.name,
      current_year = excluded.current_year;

-- A sample Office Hours session tied to Lab One
insert into public.sessions
  (id, cohort_id, lab_id, title, description, session_type, starts_at, ends_at, zoom_link) values
  ('33333333-3333-3333-3333-333333333333',
   '22222222-2222-2222-2222-222222222222',
   'lab-1',
   'Office Hours: Implementation Challenges',
   'Drop-in time to bring questions from Lab One into conversation with Dr. Sarah Chen and James Rodriguez.',
   'office_hours',
   timestamptz '2026-04-20 15:03:00+00',
   timestamptz '2026-04-20 16:00:00+00',
   'https://zoom.us/j/waw-lincoln-office-hours')
on conflict (id) do update
  set title       = excluded.title,
      description = excluded.description,
      starts_at   = excluded.starts_at,
      ends_at     = excluded.ends_at,
      zoom_link   = excluded.zoom_link;
