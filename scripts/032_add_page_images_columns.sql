-- Migration: Add missing columns to page_images table
-- This migration adds the essential columns needed for image storage

-- Add url column as the primary data field
ALTER TABLE IF EXISTS page_images
ADD COLUMN IF NOT EXISTS url TEXT;

-- Add optional metadata columns
ALTER TABLE IF EXISTS page_images
ADD COLUMN IF NOT EXISTS filename TEXT,
ADD COLUMN IF NOT EXISTS width INTEGER,
ADD COLUMN IF NOT EXISTS height INTEGER,
ADD COLUMN IF NOT EXISTS alt_text TEXT,
ADD COLUMN IF NOT EXISTS size_bytes INTEGER,
ADD COLUMN IF NOT EXISTS mime_type TEXT;

-- Ensure created_at exists
ALTER TABLE IF EXISTS page_images
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
