-- Seed the About page as a custom page
INSERT INTO custom_pages (title, slug, description, is_published, created_at, updated_at)
VALUES (
  'About the WaW Fellows Portal',
  'about',
  'Welcome to the WaW Fellows Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
  true,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Add content blocks for the About page
WITH about_page AS (
  SELECT id FROM custom_pages WHERE slug = 'about' LIMIT 1
)
INSERT INTO page_blocks (page_id, block_type, content, metadata, order_number, created_at, updated_at)
SELECT 
  ap.id,
  'text',
  'Welcome to the WaW Fellows'' Portal',
  '{"heading": true, "size": "large"}',
  1,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'text',
  'Congratulations and welcome to the WaW Fellowship!',
  '{"size": "medium"}',
  2,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'text',
  'This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.',
  '{"size": "small"}',
  3,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'image',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-yk9hNgyQQIeZ2sMEpmaQzrCr1BlN8x.png',
  '{"alt": "WaW Fellows in collaborative discussion"}',
  4,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'text',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.' || E'\n\n' ||
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.' || E'\n\n' ||
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  '{}',
  5,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'image',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Q4wysyC8JWLi02dGNyrSqptIHF6gYQ.png',
  '{"alt": "WaW Three-Year Curriculum Structure"}',
  6,
  NOW(),
  NOW()
FROM about_page
UNION ALL
SELECT 
  ap.id,
  'image',
  'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png',
  '{"alt": "John Templeton Foundation"}',
  7,
  NOW(),
  NOW()
FROM about_page;
