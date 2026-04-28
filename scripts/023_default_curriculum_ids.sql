-- The years (phases) and labs (content items) tables both use TEXT ids
-- with no DB-side default - historically the seed script generated
-- them. The new admin UI inserts rows without specifying an id, so we
-- need a default. gen_random_uuid()::text gives us collision-free
-- string ids without changing the column type.

create extension if not exists pgcrypto;

alter table public.years
  alter column id set default gen_random_uuid()::text;

alter table public.labs
  alter column id set default gen_random_uuid()::text;
