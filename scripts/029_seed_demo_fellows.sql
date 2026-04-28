-- Idempotent seed of demo fellow accounts so the invite-only login
-- page actually has fellows to log in as.
--
-- Accounts (all password: password123):
--   fellow@school.edu      - Riley Chen
--   teammate1@school.edu   - Jordan Patel
--   teammate2@school.edu   - Sam Okafor
--
-- All three sit in the "Lincoln High Leadership Team" cohort so the
-- dashboard's per-phase team-progress meter has cohort peers to
-- aggregate. Re-running the script just bumps password and profile
-- fields; it doesn't duplicate users.

create extension if not exists pgcrypto;

do $$
declare
  cohort_lincoln constant uuid := '22222222-2222-2222-2222-222222222222';
  password_hash  text := crypt('password123', gen_salt('bf'));

  -- (email, full name) tuples we want to (re)seed.
  demo_users constant text[][] := array[
    array['fellow@school.edu',    'Riley Chen'],
    array['teammate1@school.edu', 'Jordan Patel'],
    array['teammate2@school.edu', 'Sam Okafor']
  ];

  email     text;
  full_name text;
  user_id   uuid;
  i         int;
begin
  for i in 1 .. array_length(demo_users, 1) loop
    email     := demo_users[i][1];
    full_name := demo_users[i][2];

    -- Create the auth.users row only if missing - we never overwrite
    -- an id that already has FK references hanging off it (profiles,
    -- completions, reflections, etc).
    select id into user_id from auth.users where lower(email) = lower(demo_users[i][1]);

    if user_id is null then
      user_id := gen_random_uuid();
      insert into auth.users (
        id,
        instance_id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        confirmation_token,
        recovery_token,
        email_change_token_new,
        email_change
      ) values (
        user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        email,
        password_hash,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', full_name),
        now(),
        now(),
        '',
        '',
        '',
        ''
      );
    else
      -- Existing user - just refresh the password hash and confirm
      -- the email so login always works after a re-run.
      update auth.users
         set encrypted_password = password_hash,
             email_confirmed_at = coalesce(email_confirmed_at, now()),
             updated_at         = now()
       where id = user_id;
    end if;

    -- Mirror auth identity (some Supabase versions require an
    -- identities row matching the email provider).
    insert into auth.identities (
      id,
      user_id,
      provider_id,
      provider,
      identity_data,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      user_id,
      user_id::text,
      'email',
      jsonb_build_object('sub', user_id::text, 'email', email),
      now(),
      now(),
      now()
    )
    on conflict (provider, provider_id) do update
      set identity_data    = excluded.identity_data,
          last_sign_in_at  = now(),
          updated_at       = now();

    -- Profile row: a trigger usually auto-inserts on auth.users
    -- creation, but we upsert the role + cohort + name explicitly
    -- so the dashboard knows this is a fellow in Lincoln High.
    insert into public.profiles (id, email, full_name, role, cohort)
    values (user_id, email, full_name, 'fellow', cohort_lincoln)
    on conflict (id) do update
      set email     = excluded.email,
          full_name = excluded.full_name,
          role      = excluded.role,
          cohort    = excluded.cohort;
  end loop;
end $$;
