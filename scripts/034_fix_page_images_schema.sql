-- Migration: Fix page_images schema - make page_id optional
-- Images should be able to exist as a library without being tied to a specific page

ALTER TABLE IF EXISTS page_images
ALTER COLUMN page_id DROP NOT NULL;

-- Drop the foreign key constraint if it exists
ALTER TABLE IF EXISTS page_images
DROP CONSTRAINT IF EXISTS page_images_page_id_fkey;
