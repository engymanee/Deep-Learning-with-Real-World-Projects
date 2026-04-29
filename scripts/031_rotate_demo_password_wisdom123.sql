-- Rotate the shared demo password to 'wisdom123' for all four
-- demo accounts. Cost factor pinned to 10 so Supabase GoTrue
-- accepts the hash (gen_salt('bf') would otherwise default to
-- cost 6 and silently produce unusable hashes).
create extension if not exists pgcrypto;

update auth.users
   set encrypted_password = crypt('wisdom123', gen_salt('bf', 10)),
       updated_at         = now()
 where lower(email) in (
   'fellow@school.edu',
   'teammate1@school.edu',
   'teammate2@school.edu',
   'admin@school.org'
 );
