-- Expand community_posts.kind to drive the new Community sections
-- (What's New? / Fellow Reflections / Wins & Progress / Ask).
--
-- We keep the legacy 'post' and 'story' values so any existing rows
-- stay valid; new rows will use one of the four sectional kinds.
-- 'story' rows are interpreted as reflections by the UI.
alter table public.community_posts
  drop constraint if exists community_posts_kind_valid;

alter table public.community_posts
  add constraint community_posts_kind_valid
    check (kind in (
      'post',
      'story',
      'announcement',
      'reflection',
      'win',
      'question'
    ));

create index if not exists community_posts_kind_published_idx
  on public.community_posts (kind, coalesce(published_at, created_at) desc);

comment on column public.community_posts.kind is
  'Section routing for Community: announcement (What''s New?), reflection (Fellow Reflections), win (Wins & Progress), question (Ask the Community). Legacy values: post, story.';
