-- Repairs the demo fellow passwords seeded by 029. The original
-- run used pgcrypto's gen_salt('bf') without a cost argument, which
-- defaults to bcrypt cost 6 (`$2a$06$...`). Supabase GoTrue rejects
-- anything below cost 10 with "Invalid login credentials", so the
-- accounts existed but couldn't log in.
--
-- This migration re-hashes 'password123' at cost 10 in place. It
-- changes only the encrypted_password and updated_at columns on
-- the three demo fellows and never deletes or recreates rows.

create extension if not exists pgcrypto;

update auth.users
   set encrypted_password = crypt('password123', gen_salt('bf', 10)),
       updated_at         = now()
 where lower(email) in (
   'fellow@school.edu',
   'teammate1@school.edu',
   'teammate2@school.edu'
 );
