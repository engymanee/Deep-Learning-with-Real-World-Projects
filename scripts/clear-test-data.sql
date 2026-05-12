-- Clear all user curriculum progress
DELETE FROM user_content_progress;

-- Clear all reflections
DELETE FROM user_content_reflections;

-- Clear all wins from community posts
DELETE FROM community_posts WHERE kind = 'win';

-- Reset sequences if needed
ALTER SEQUENCE user_content_progress_id_seq RESTART WITH 1;
ALTER SEQUENCE user_content_reflections_id_seq RESTART WITH 1;
ALTER SEQUENCE community_posts_id_seq RESTART WITH 1;
