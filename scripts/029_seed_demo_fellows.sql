-- Idempotent seed of demo fellow accounts so the invite-only login
-- page actually has fellows to log in as.
--
-- Accounts (all password: wisdom123):
--   fellow@school.edu      - Riley Chen
--   teammate1@school.edu   - Jordan Patel
--   teammate2@school.edu   - Sam Okafor
--
-- All three sit in cohort 'A' (a short text label - public.profiles
-- .cohort is NOT a FK to public.cohorts.id, it's a checked text
-- column whose accepted values today are 'A'/'B') so the dashboard's
-- per-phase team-progress meter has cohort peers to aggregate.
-- Re-running the script just refreshes the password hash and profile
-- fields; it never duplicates users or breaks foreign keys.

create extension if not exists pgcrypto;

do $$
declare
  cohort_label   constant text := 'A';
  -- Cost factor MUST be 10+. Supabase GoTrue rejects bcrypt
  -- hashes below cost 10 as "Invalid login credentials" - and
  -- pgcrypto's gen_salt('bf') defaults to cost 6, which silently
  -- produces unusable hashes. Always pin to 10 to match Supabase's
  -- own admin-created users.
  password_hash  text := crypt('wisdom123', gen_salt('bf', 10));

  -- (email, full name) tuples we want to (re)seed.
  demo_users constant text[][] := array[
    array['fellow@school.edu',    'Riley Chen'],
    array['teammate1@school.edu', 'Jordan Patel'],
    array['teammate2@school.edu', 'Sam Okafor']
  ];

  -- Locals are prefixed `v_` so they don't collide with column names
  -- inside the embedded inserts/updates (the unprefixed `email` had
  -- previously matched `auth.users.email` and broke the do-block).
  v_email     text;
  v_full_name text;
  v_user_id   uuid;
  i           int;
begin
  for i in 1 .. array_length(demo_users, 1) loop
    v_email     := demo_users[i][1];
    v_full_name := demo_users[i][2];

    -- Create the auth.users row only if missing - we never overwrite
    -- an id that already has FK references hanging off it (profiles,
    -- completions, reflections, etc).
    select u.id
      into v_user_id
      from auth.users u
     where lower(u.email) = lower(v_email);

    if v_user_id is null then
      v_user_id := gen_random_uuid();
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
        v_user_id,
        '00000000-0000-0000-0000-000000000000',
        'authenticated',
        'authenticated',
        v_email,
        password_hash,
        now(),
        jsonb_build_object('provider', 'email', 'providers', array['email']),
        jsonb_build_object('full_name', v_full_name),
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
      update auth.users u
         set encrypted_password = password_hash,
             email_confirmed_at = coalesce(u.email_confirmed_at, now()),
             updated_at         = now()
       where u.id = v_user_id;
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
      v_user_id,
      v_user_id::text,
      'email',
      jsonb_build_object('sub', v_user_id::text, 'email', v_email),
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
    -- so the dashboard knows this is a fellow in cohort 'A'.
    insert into public.profiles (id, email, full_name, role, cohort)
    values (v_user_id, v_email, v_full_name, 'fellow', cohort_label)
    on conflict (id) do update
      set email     = excluded.email,
          full_name = excluded.full_name,
          role      = excluded.role,
          cohort    = excluded.cohort;
  end loop;
end $$;
