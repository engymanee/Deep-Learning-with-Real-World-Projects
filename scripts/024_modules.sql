-- Introduce a Module level between Phase (years) and Content (labs).
--
-- Hierarchy: years -> modules -> labs.
-- Cohort gating cascades downwards with explicit override:
--   * years.cohorts is the source of truth for the phase
--   * modules.cohorts NULL  -> inherit from phase
--                       []  -> locked from everyone
--                       [X] -> override
--   * labs.cohorts already nullable with the same semantics, but
--     inheritance now resolves through the module first.
--
-- Existing data: 1 phase / 0 content items, so no backfill is needed.
-- We can safely enforce labs.module_id NOT NULL from day one.

create table if not exists public.modules (
  id            text primary key default gen_random_uuid()::text,
  phase_id      text not null references public.years(id) on delete cascade,
  title         text not null,
  description   text,
  order_index   integer not null default 0,
  cohorts       text[],
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists modules_phase_order_idx
  on public.modules (phase_id, order_index);

alter table public.labs
  add column if not exists module_id text references public.modules(id) on delete cascade;

-- Safe because labs is empty.
alter table public.labs
  alter column module_id set not null;

create index if not exists labs_module_order_idx
  on public.labs (module_id, order_index);
