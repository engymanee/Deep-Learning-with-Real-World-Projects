-- 046_seed_users.sql
-- Create four users with password 'wisdom123' that can sign in via Supabase Auth,
-- and ensure each has a matching public.profiles row with the correct role.
-- Idempotent: re-running skips emails that already exist in auth.users.

-- We use a CTE-driven INSERT so all four rows are created in one statement,
-- and we guard with NOT EXISTS instead of ON CONFLICT because auth.users has
-- a partial unique index on (email) that conflict-target syntax can't address
-- portably across Supabase versions.

with desired (email, role, full_name) as (
  values
    ('maura@abigailadamsinstitute.org',    'admin',  'Maura'),
    ('markbarbapacheco@gmail.com',         'fellow', 'Mark Barba Pacheco'),
    ('kbohlin@abigailadamsinstitute.org',  'fellow', 'K. Bohlin'),
    ('andrea@abigailadamsinstitute.org',   'fellow', 'Andrea')
),
to_create as (
  select
    extensions.gen_random_uuid() as id,
    d.email,
    d.role,
    d.full_name
  from desired d
  where not exists (
    select 1 from auth.users u where u.email = d.email
  )
),
created_users as (
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    invited_at,
    confirmation_token,
    confirmation_sent_at,
    recovery_token,
    recovery_sent_at,
    email_change_token_new,
    email_change,
    email_change_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    created_at,
    updated_at,
    phone,
    phone_confirmed_at,
    phone_change,
    phone_change_token,
    phone_change_sent_at,
    email_change_token_current,
    email_change_confirm_status,
    banned_until,
    reauthentication_token,
    reauthentication_sent_at,
    is_sso_user,
    deleted_at
  )
  select
    '00000000-0000-0000-0000-000000000000'::uuid,
    tc.id,
    'authenticated',
    'authenticated',
    tc.email,
    extensions.crypt('wisdom123', extensions.gen_salt('bf')),
    now(),                                  -- email_confirmed_at
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    null,
    jsonb_build_object('provider', 'email', 'providers', jsonb_build_array('email')),
    jsonb_build_object('full_name', tc.full_name),
    false,
    now(),
    now(),
    null,
    null,
    '',
    '',
    null,
    '',
    0,
    null,
    '',
    null,
    false,
    null
  from to_create tc
  returning id, email
),
created_identities as (
  -- Required for password sign-in: each user needs a matching identity row
  -- in the 'email' provider. provider_id must equal the user id (text).
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    extensions.gen_random_uuid(),
    cu.id,
    jsonb_build_object('sub', cu.id::text, 'email', cu.email, 'email_verified', true),
    'email',
    cu.id::text,
    now(),
    now(),
    now()
  from created_users cu
  returning user_id
)
select count(*) as new_users_created from created_identities;

-- Mirror role + name into public.profiles (one row per auth user)
insert into public.profiles (id, email, full_name, role)
select u.id, u.email, d.full_name, d.role
from auth.users u
join (
  values
    ('maura@abigailadamsinstitute.org',    'admin',  'Maura'),
    ('markbarbapacheco@gmail.com',         'fellow', 'Mark Barba Pacheco'),
    ('kbohlin@abigailadamsinstitute.org',  'fellow', 'K. Bohlin'),
    ('andrea@abigailadamsinstitute.org',   'fellow', 'Andrea')
) as d(email, role, full_name) on d.email = u.email
on conflict (id) do update
  set role      = excluded.role,
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      email     = excluded.email,
      updated_at = now();
