-- 047_email_login_codes.sql
-- Storage for first-party 6-digit email-based sign-in codes used by the
-- "Email me a code" branch of the activation flow. We deliberately do NOT
-- rely on Supabase's built-in OTP (admin.generateLink) for the user-facing
-- code: that path is configured to 8 digits in the Supabase project, and
-- generating a Supabase magic link also dispatches an unwanted hosted
-- email whose link auto-signs the recipient in.
--
-- Codes are hashed with sha256 + a per-row random salt, so a database
-- compromise does not expose live codes. Codes are single-use and
-- short-lived (10 minutes). Issuing a new code for an email address
-- invalidates any prior unused rows for the same address.

create table if not exists public.email_login_codes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code_hash text not null,
  salt text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists email_login_codes_email_active_idx
  on public.email_login_codes (email, created_at desc)
  where used_at is null;

create index if not exists email_login_codes_expires_idx
  on public.email_login_codes (expires_at);

-- Server-only table: only the service role inserts/queries. RLS is
-- enabled with no policies so anon/authenticated have no access at all;
-- the service role bypasses RLS.
alter table public.email_login_codes enable row level security;
