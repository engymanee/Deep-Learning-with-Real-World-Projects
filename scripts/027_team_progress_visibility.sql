-- 027_team_progress_visibility
-- Lets cohort peers and admins read each other's
-- user_content_completions rows so the dashboard can render team
-- progress meters. Writes still stay locked down to the row owner.

drop policy if exists "Cohort peers read completions"
  on public.user_content_completions;
drop policy if exists "Admins read all completions"
  on public.user_content_completions;

-- Fellows in the same cohort (matching the legacy `profiles.cohort`
-- text field that drives content visibility) can see one another's
-- completion rows. Admins/facilitators bypass cohort scoping.
create policy "Cohort peers read completions"
  on public.user_content_completions for select
  using (
    exists (
      select 1
      from public.profiles me
      join public.profiles peer on peer.cohort = me.cohort
      where me.id = auth.uid()
        and peer.id = user_content_completions.profile_id
        and me.cohort is not null
    )
  );

create policy "Admins read all completions"
  on public.user_content_completions for select
  using (
    exists (
      select 1
      from public.profiles me
      where me.id = auth.uid()
        and me.role = 'admin'
    )
  );
