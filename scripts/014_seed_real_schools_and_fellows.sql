-- Seed the five partner schools with their 25 Year-1 fellows,
-- plus one Year-2 and one Year-3 dummy fellow so the dashboard
-- can be tested in every state. Idempotent: re-running is a no-op.

-- pgcrypto is pre-installed on Supabase under the `extensions` schema.

-- 1. Schools ---------------------------------------------------------
insert into public.schools (name)
select v.name
  from (values
    ('CICS Wrightwood'),
    ('Atchison High'),
    ('IVA High'),
    ('BTA'),
    ('Washington Latin'),
    ('Bay Area Collegiate'),
    ('Northside Academy')
  ) v(name)
 where not exists (select 1 from public.schools s where s.name = v.name);

-- 2. Cohorts ---------------------------------------------------------
-- Year-1 cohorts (one per Year-1 school)
insert into public.cohorts (school_id, name, current_year)
select s.id, s.name || ' Leadership Team', 1
  from public.schools s
 where s.name in ('CICS Wrightwood','Atchison High','IVA High','BTA','Washington Latin')
   and not exists (
     select 1 from public.cohorts c where c.school_id = s.id
   );

-- Year-2 and Year-3 cohorts for the dummy fellows
insert into public.cohorts (school_id, name, current_year)
select s.id, s.name || ' Leadership Team', 2
  from public.schools s
 where s.name = 'Bay Area Collegiate'
   and not exists (select 1 from public.cohorts c where c.school_id = s.id);

insert into public.cohorts (school_id, name, current_year)
select s.id, s.name || ' Leadership Team', 3
  from public.schools s
 where s.name = 'Northside Academy'
   and not exists (select 1 from public.cohorts c where c.school_id = s.id);

-- 3. Helper function to create a fellow -----------------------------
create or replace function public._seed_fellow(
  p_email       text,
  p_full_name   text,
  p_title       text,
  p_school_name text
) returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $func$
declare
  v_user_id   uuid;
  v_school_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_user_meta_data, raw_app_meta_data,
      created_at, updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      p_email,
      extensions.crypt('WisdomAtWork2526!', extensions.gen_salt('bf')),
      now(),
      jsonb_build_object('full_name', p_full_name, 'role', 'fellow'),
      jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
      now(),
      now()
    );

    insert into auth.identities (
      user_id, provider_id, provider, identity_data,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object('sub', v_user_id::text, 'email', p_email),
      now(), now(), now()
    );
  end if;

  select id into v_school_id
    from public.schools
   where name = p_school_name
   limit 1;

  -- Profile: trigger already created it, but we fill in title/school.
  insert into public.profiles (id, full_name, email, title, role, school_id)
  values (v_user_id, p_full_name, p_email, p_title, 'fellow', v_school_id)
  on conflict (id) do update
    set full_name = excluded.full_name,
        email     = excluded.email,
        title     = excluded.title,
        school_id = excluded.school_id;

  return v_user_id;
end
$func$;

-- 4. The 25 Year-1 fellows ------------------------------------------
do $$
begin
  -- CICS Wrightwood
  perform public._seed_fellow('dlewis@cicswrightwood.org',        'David Lewis',         'Principal',                        'CICS Wrightwood');
  perform public._seed_fellow('vbush@cicswrightwood.org',         'Valencia Bush',       'Assistant Principal',              'CICS Wrightwood');
  perform public._seed_fellow('dgoodwin@cicswrightwood.org',      'Daniel R. Goodwin',   'Assistant Principal',              'CICS Wrightwood');
  perform public._seed_fellow('wlee@cicswrightwood.org',          'William Lee',         'Instructional Coach',              'CICS Wrightwood');

  -- Atchison High
  perform public._seed_fellow('latisha.williams@usd409.net',      'LaTisha Williams',    'Principal',                        'Atchison High');
  perform public._seed_fellow('blaine.clardy@usd409.net',         'Blaine Clardy',       'Assistant Principal',              'Atchison High');
  perform public._seed_fellow('stephanie.berkhalter@usd409.net',  'Stephanie Berkhalter','9th-12th Grade Counselor',         'Atchison High');
  perform public._seed_fellow('gerre.martin@usd409.net',          'Gerre Martin',        'Junior & Senior Counselor',        'Atchison High');

  -- IVA High
  perform public._seed_fellow('summer.sanders@ivahigh.org',       'Summer Sanders',      'Head of School - Founding Director', 'IVA High');
  perform public._seed_fellow('james.mcgrath@ivahigh.org',        'James McGrath',       'Founding Director',                'IVA High');
  perform public._seed_fellow('dustin.schmidt@ivahigh.org',       'Dustin Schmidt',      'Associate Director of Instruction','IVA High');
  perform public._seed_fellow('darlin.ortiz@ivahigh.org',         'Darlin Ortiz',        'School Counselor',                 'IVA High');
  perform public._seed_fellow('daniel.avery@ivahigh.org',         'Daniel Avery',        'Math Teacher',                     'IVA High');
  perform public._seed_fellow('megan.gomes@ivahigh.org',          'Megan Gomes',         'Office Manager',                   'IVA High');

  -- BTA (Boston Trinity Academy)
  perform public._seed_fellow('tbelk@bostontrinity.org',          'Tim Belk',            'Headmaster',                       'BTA');
  perform public._seed_fellow('boloko@bostontrinity.org',         'Bisi Oloko',          'Assistant Head for Admission',     'BTA');
  perform public._seed_fellow('kloper@bostontrinity.org',         'Kris Loper',          'Academic Dean',                    'BTA');
  perform public._seed_fellow('jgonzalez@bostontrinity.org',      'Juan Gonzalez',       'Dean of Students',                 'BTA');
  perform public._seed_fellow('ihill@bostontrinity.org',          'Ingrid Hill',         'Dean of Middle School',            'BTA');
  perform public._seed_fellow('tpatrick@bostontrinity.org',       'Tom Patrick',         'Dean of Faculty',                  'BTA');

  -- Washington Latin
  perform public._seed_fellow('jkelly@latinpcs.org',              'James Kelly',         'Principal, 2nd Street campus',     'Washington Latin');
  perform public._seed_fellow('taustin@latinpcs.org',             'Tiffany Austin',      'Director of the Upper School',     'Washington Latin');
  perform public._seed_fellow('mkovach@latinpcs.org',             'Meg Kovach',          'Assistant Director of the Upper School', 'Washington Latin');
  perform public._seed_fellow('gdreux@latinpcs.org',              'Gabrielle Dreux',     'Assistant Director of the Upper School', 'Washington Latin');
  perform public._seed_fellow('tpettiford@latinpcs.org',          'Treshia Pettiford',   'Director of Student Life',         'Washington Latin');

  -- Year-2 dummy fellow
  perform public._seed_fellow('maria.chen@bayareacollegiate.org', 'Maria Chen',          'Head of School',                   'Bay Area Collegiate');

  -- Year-3 dummy fellow
  perform public._seed_fellow('jerome.whitaker@northsideacademy.org', 'Jerome Whitaker', 'Principal',                        'Northside Academy');
end $$;

-- 5. Cohort membership ----------------------------------------------
insert into public.cohort_members (cohort_id, profile_id)
select c.id, p.id
  from public.profiles p
  join public.cohorts  c on c.school_id = p.school_id
 where p.role = 'fellow'
   and not exists (
     select 1 from public.cohort_members cm
      where cm.cohort_id  = c.id
        and cm.profile_id = p.id
   );

-- 6. Year progression -----------------------------------------------
-- Year-1 fellows: year-1 unlocked and in progress.
insert into public.user_year_progress (profile_id, year_id, status, progress, unlocked_at)
select p.id, 'year-1', 'in_progress', 0, now()
  from public.profiles p
  join public.schools  s on s.id = p.school_id
 where p.role = 'fellow'
   and s.name in ('CICS Wrightwood','Atchison High','IVA High','BTA','Washington Latin')
on conflict (profile_id, year_id) do nothing;

-- Year-2 dummy: year-1 completed, year-2 in progress.
insert into public.user_year_progress (profile_id, year_id, status, progress, unlocked_at, completed_at)
select p.id, 'year-1', 'complete', 100, now() - interval '1 year', now() - interval '3 months'
  from public.profiles p
 where p.email = 'maria.chen@bayareacollegiate.org'
on conflict (profile_id, year_id)
  do update set status = 'complete', progress = 100, completed_at = excluded.completed_at;

insert into public.user_year_progress (profile_id, year_id, status, progress, unlocked_at)
select p.id, 'year-2', 'in_progress', 15, now() - interval '3 months'
  from public.profiles p
 where p.email = 'maria.chen@bayareacollegiate.org'
on conflict (profile_id, year_id)
  do update set status = 'in_progress', progress = 15, unlocked_at = excluded.unlocked_at;

-- Year-3 dummy: year-1 and year-2 completed, year-3 in progress.
insert into public.user_year_progress (profile_id, year_id, status, progress, unlocked_at, completed_at)
select p.id, y.id, 'complete', 100, now() - interval '2 years', now() - interval '15 months'
  from public.profiles p
  cross join (values ('year-1'), ('year-2')) y(id)
 where p.email = 'jerome.whitaker@northsideacademy.org'
on conflict (profile_id, year_id)
  do update set status = 'complete', progress = 100, completed_at = excluded.completed_at;

insert into public.user_year_progress (profile_id, year_id, status, progress, unlocked_at)
select p.id, 'year-3', 'in_progress', 10, now() - interval '3 months'
  from public.profiles p
 where p.email = 'jerome.whitaker@northsideacademy.org'
on conflict (profile_id, year_id)
  do update set status = 'in_progress', progress = 10, unlocked_at = excluded.unlocked_at;

-- 7. Cleanup ---------------------------------------------------------
drop function if exists public._seed_fellow(text, text, text, text);
