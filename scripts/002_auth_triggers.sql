-- =============================================================================
-- WAW Program — Auth Sync + updated_at Triggers
-- Auto-creates a public.profiles row whenever a new auth user signs up, and
-- keeps updated_at columns fresh on mutable tables.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- updated_at helper + triggers
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_year_progress;
create trigger set_updated_at
  before update on public.user_year_progress
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_lab_progress;
create trigger set_updated_at
  before update on public.user_lab_progress
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.user_lesson_progress;
create trigger set_updated_at
  before update on public.user_lesson_progress
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.reader_responses;
create trigger set_updated_at
  before update on public.reader_responses
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.learning_journal_entries;
create trigger set_updated_at
  before update on public.learning_journal_entries
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.discussion_posts;
create trigger set_updated_at
  before update on public.discussion_posts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- Auto-create a profile row on signup
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
