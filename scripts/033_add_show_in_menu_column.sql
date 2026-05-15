-- Migration: Add show_in_menu column to custom_pages table
-- Purpose: Allow pages to be hidden from navigation menu while still being accessible

ALTER TABLE IF EXISTS custom_pages
ADD COLUMN IF NOT EXISTS show_in_menu BOOLEAN DEFAULT TRUE;

-- Create index for filtering published pages in menu
CREATE INDEX IF NOT EXISTS idx_custom_pages_published_menu 
ON custom_pages(is_published, show_in_menu) 
WHERE is_published = true AND show_in_menu = true;
