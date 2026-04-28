-- Add `live_session` to the content_resource_type Postgres enum so
-- admins can pick it from the form. The TS RESOURCE_TYPES list
-- already includes the value; this brings the database in sync.
alter type public.content_resource_type add value if not exists 'live_session';
