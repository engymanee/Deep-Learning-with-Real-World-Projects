-- Add header columns to custom_pages table
ALTER TABLE custom_pages
ADD COLUMN IF NOT EXISTS header1 TEXT,
ADD COLUMN IF NOT EXISTS header2 TEXT,
ADD COLUMN IF NOT EXISTS header3 TEXT;

-- Insert the About page into custom_pages
INSERT INTO custom_pages (title, slug, description, header1, is_published, show_in_menu, created_by)
VALUES (
  'Welcome to the Wisdom at Work Fellows\'' Portal',
  'about',
  'This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.',
  'Welcome to the Wisdom at Work Fellows\'' Portal',
  true,
  true,
  'system'
)
ON CONFLICT (slug) DO NOTHING;

-- Get the page ID for inserting blocks
-- Note: You'll need to get the ID from the insert above and use it for the blocks
-- After running this, get the custom_pages ID for slug='about' and use it in the next query
