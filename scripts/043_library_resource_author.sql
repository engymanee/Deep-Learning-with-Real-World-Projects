-- 043_library_resource_author.sql
--
-- Adds an `author` column to public.community_resources so the
-- Library can attribute every resource to a person/organisation.
--
-- The column is nullable so legacy rows (created before this
-- migration) keep working without a destructive backfill. The
-- admin form enforces a non-empty value for any insert/update made
-- from this point forward, which matches the product requirement
-- ("every resource should ask for the author").

alter table public.community_resources
  add column if not exists author text;

comment on column public.community_resources.author is
  'Display attribution for the resource - book/article author, video creator, podcast host, etc. Required at the application layer (admin form enforces non-empty), but the column is nullable so legacy pre-043 rows survive without a destructive backfill.';
