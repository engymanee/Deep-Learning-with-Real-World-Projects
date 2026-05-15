-- Migration: Add missing columns to page_blocks table
-- Purpose: Ensure page_blocks has all required schema columns

ALTER TABLE IF EXISTS page_blocks
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_page_blocks_order ON page_blocks(page_id, order_number);
