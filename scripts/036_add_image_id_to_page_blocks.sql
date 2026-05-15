-- Add image_id column to page_blocks table
ALTER TABLE IF EXISTS page_blocks
ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES page_images(id) ON DELETE SET NULL;
