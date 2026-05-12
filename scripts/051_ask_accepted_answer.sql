-- Phase 4: Asks lifecycle additions.
--
-- Adds the column that lets askers accept a single comment as the
-- "best answer". Set null to clear; FK to community_comments so a
-- deleted comment automatically unlinks the acceptance.

alter table public.community_posts
  add column if not exists accepted_answer_comment_id uuid
    references public.community_comments(id) on delete set null;

-- Backfill: any existing 'question' rows without an ask_status get
-- 'open' so the lifecycle filter has a sane default.
update public.community_posts
   set ask_status = 'open'
 where kind = 'question' and ask_status is null;

-- Same for ask_category - default to 'general' for legacy questions
-- so the new required-category UI doesn't reject them on edit.
update public.community_posts
   set ask_category = 'general'
 where kind = 'question' and ask_category is null;
