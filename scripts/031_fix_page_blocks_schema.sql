-- Migration: Add missing columns to page_blocks table
-- Purpose: Fix schema to include order_number and ensure proper structure

-- Add missing columns if they don't exist
ALTER TABLE IF EXISTS page_blocks
ADD COLUMN IF NOT EXISTS order_number INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS block_type TEXT DEFAULT 'text',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint if table has data
ALTER TABLE page_blocks
ADD CONSTRAINT page_blocks_block_type_check
CHECK (block_type IN ('text', 'image', 'combined'))
ON CONFLICT DO NOTHING;

-- Create missing index
CREATE INDEX IF NOT EXISTS idx_page_blocks_order ON page_blocks(page_id, order_number);
