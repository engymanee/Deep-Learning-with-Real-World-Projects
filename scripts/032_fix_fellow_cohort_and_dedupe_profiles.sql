-- 032_fix_fellow_cohort_and_dedupe_profiles.sql
--
-- Resolves a bug where a phase only assigned to cohort A was
-- showing as unlocked for fellow@school.edu, who the admin had
-- placed in cohort B. Root cause: there were two public.profiles
-- rows for the same email - an orphan (id aaaa...aaaa) tied to no
-- auth user, and the real one (id matching auth.users.id) tied to
-- the seeded login. Admin edits hit the orphan; the live login
-- kept reading the seeded cohort.
--
-- Steps:
--   1. Delete the orphan profile (zero dependent rows).
--   2. Move the auth-linked fellow profile to cohort B.
--   3. Add a case-insensitive unique index on profiles.email so
--      no two profiles can share an email going forward.

delete from public.profiles
 where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid;

update public.profiles
   set cohort = 'B'
 where id = (
   select u.id
     from auth.users u
    where lower(u.email) = 'fellow@school.edu'
 );

create unique index if not exists profiles_email_lower_unique
  on public.profiles (lower(email));
