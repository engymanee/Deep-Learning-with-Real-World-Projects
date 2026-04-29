-- Seed bios for any profile that lacks one. Generic on purpose so
-- it's obvious these are placeholders; admins / participants will
-- overwrite as profiles are filled in.
update public.profiles
   set bio = 'School leader committed to equitable outcomes. Sample bio - replace via profile editor.'
 where bio is null
   and role in ('fellow', 'facilitator');

-- Backfill event_type so the Community Events filter has something
-- to filter by. The categorisation is heuristic (title contains
-- "lab" -> lab_session, "workshop" -> workshop, etc.) and is only
-- applied to rows that are still null - we never overwrite an
-- explicitly-set value.
update public.community_events
   set event_type = case
     when title ilike '%lab%'      then 'lab_session'
     when title ilike '%workshop%' then 'workshop'
     when title ilike '%webinar%'  then 'webinar'
     else 'meet_up'
   end
 where event_type is null;
