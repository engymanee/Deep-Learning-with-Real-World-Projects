-- Migration: Create custom pages tables
-- Purpose: Support the custom pages feature with images and content blocks

-- Page images storage table
CREATE TABLE IF NOT EXISTS page_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  alt_text TEXT,
  size_bytes INTEGER,
  mime_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Custom pages table
CREATE TABLE IF NOT EXISTS custom_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_published BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Page blocks table
CREATE TABLE IF NOT EXISTS page_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES custom_pages(id) ON DELETE CASCADE,
  block_type TEXT NOT NULL CHECK (block_type IN ('text', 'image', 'combined')),
  order_number INTEGER NOT NULL,
  title TEXT,
  content TEXT,
  metadata JSONB,
  image_id UUID REFERENCES page_images(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_custom_pages_slug ON custom_pages(slug);
CREATE INDEX IF NOT EXISTS idx_custom_pages_is_published ON custom_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_custom_pages_created_by ON custom_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_page_blocks_page_id ON page_blocks(page_id);
CREATE INDEX IF NOT EXISTS idx_page_blocks_order ON page_blocks(page_id, order_number);

-- Enable RLS on all tables
ALTER TABLE page_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_blocks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for page_images
CREATE POLICY "Anyone can read page images" ON page_images
  FOR SELECT USING (true);

CREATE POLICY "Only admins can insert page images" ON page_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for custom_pages
CREATE POLICY "Anyone can read published custom pages" ON custom_pages
  FOR SELECT USING (is_published = true OR created_by = auth.uid());

CREATE POLICY "Only admins can insert custom pages" ON custom_pages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can update custom pages" ON custom_pages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Only admins can delete custom pages" ON custom_pages
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for page_blocks
CREATE POLICY "Anyone can read page blocks from published pages" ON page_blocks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM custom_pages
      WHERE custom_pages.id = page_blocks.page_id
      AND custom_pages.is_published = true
    )
  );

CREATE POLICY "Only admins can manage page blocks" ON page_blocks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
