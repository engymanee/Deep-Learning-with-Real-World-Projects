-- =============================================================================
-- Enhance schools table with profile information
-- Adds description, location, contact details, and logo
-- =============================================================================

alter table public.schools
  add column if not exists description text,
  add column if not exists location text,
  add column if not exists contact_email text,
  add column if not exists website_url text,
  add column if not exists logo_url text;
