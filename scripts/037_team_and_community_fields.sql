-- Profile bio. Used by ProfileView (Team + Community) for the
-- short bio shown on the bio cards and the longer one in the
-- modal. Plain text - rendered with whitespace-pre-wrap.
alter table public.profiles
  add column if not exists bio text;

comment on column public.profiles.bio is
  'Free-form bio shown on the Team and Community profile views.';

-- Event type drives the Community Events filter. Constrained to
-- the four labels Karen approved; nullable so legacy rows render
-- as "Event" until categorised.
alter table public.community_events
  add column if not exists event_type text;

alter table public.community_events
  drop constraint if exists community_events_event_type_valid;
alter table public.community_events
  add constraint community_events_event_type_valid
    check (event_type is null
        or event_type in ('workshop', 'lab_session', 'meet_up', 'webinar'));

create index if not exists community_events_event_type_idx
  on public.community_events (event_type);

comment on column public.community_events.event_type is
  'Community event filter: workshop | lab_session | meet_up | webinar (null = uncategorised).';
