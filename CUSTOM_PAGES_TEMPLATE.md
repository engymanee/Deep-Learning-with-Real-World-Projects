# Custom Pages Template Structure - Unified Approach

## Overview

All custom pages (including the About page) now follow a unified template structure that is:
- **Editable**: Admins can edit content via `/admin/custom-pages`
- **Flexible**: Supports headers, cover images, and content blocks
- **Reusable**: The same pattern applies to all pages
- **Extensible**: New pages follow the same structure automatically

## About Page - The Standard Template

The About page (`/about`) is the reference implementation. It demonstrates:

### Data Structure

```typescript
CustomPage {
  id: string
  title: "About the WaW Fellows Portal"
  slug: "about"
  description: "Learn about the Wisdom at Work Fellowship..."
  cover_image_url?: string (optional hero image)
  header1, header2, header3?: string (optional headers)
  header1_position, header2_position, header3_position?: 'before' | 'after' | 'hidden'
  is_published: true
  show_in_menu: true
  blocks: PageBlock[]
}

PageBlock {
  id: string
  page_id: string
  block_type: 'text' | 'image'
  order_number: number
  content: string (text content or image URL)
  metadata: { 
    heading?: boolean
    size?: 'large' | 'medium' | 'small'
    alt?: string (for images)
  }
}
```

### Content Block Types

#### 1. Text Blocks with Metadata

```javascript
// Large heading block
{
  block_type: 'text',
  content: 'Welcome to the Wisdom at Work Fellows\' Portal',
  metadata: { heading: true, size: 'large' }
}

// Medium paragraph
{
  block_type: 'text',
  content: 'Your welcome message here',
  metadata: { size: 'medium' }
}

// Small text
{
  block_type: 'text',
  content: 'Secondary information',
  metadata: { size: 'small' }
}

// Regular body text with Markdown support
{
  block_type: 'text',
  content: 'Regular paragraph text. Supports **bold**, *italic*, etc.',
  metadata: {}
}
```

#### 2. Image Blocks

```javascript
{
  block_type: 'image',
  content: 'https://example.com/image.png',
  metadata: { alt: 'Image description' }
}
```

### Original About Page Layout

The About page demonstrates the full template with:

1. **Welcome Section** - Title + subtitle + description
2. **First Image** - Team collaboration photo
3. **Body Text** - Lorem ipsum placeholder
4. **Curriculum Image** - Three-year structure
5. **Foundation Attribution** - Templeton Foundation logo

## How Routes Work

### About Page Route
- **URL**: `/about`
- **File**: `/app/about/page.tsx`
- **Behavior**: 
  - Loads custom page with slug "about"
  - Admins see inline editor
  - Public sees rendered page
  - Shows 404 if page doesn't exist

### Other Custom Pages
- **URL Pattern**: `/pages/[slug]`
- **File**: `/app/pages/[slug]/page.tsx`
- **Behavior**: Same as About page

## Setting Up the About Page

### Option 1: Use the Seeding Endpoint (Recommended)

1. Go to `/api/admin/seed-about-page`
2. Make a POST request (requires admin auth)
3. Returns: Page created with original content

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/admin/seed-about-page
```

### Option 2: Manual Creation via Admin Panel

1. Navigate to `/admin/custom-pages`
2. Click "Create New Page"
3. Fill in:
   - **Title**: "About the WaW Fellows Portal"
   - **Slug**: "about"
   - **Description**: "Learn about the Fellowship"
4. Add content blocks matching the template
5. Click "Publish"

## Creating New Custom Pages

All new pages automatically follow this structure:

1. **Create in Admin Panel** (`/admin/custom-pages`)
   - Set title, slug, description
   - Add content blocks
   - Set headers if needed
   - Add cover image if desired

2. **Access via Routes**
   - If slug is "about": `/about`
   - Other slugs: `/pages/your-slug`

3. **Edit Content**
   - Admins: Inline editor or admin panel
   - Content: Mix text and image blocks freely

## Key Files

- **Page Renderer**: `/components/custom-pages/page-renderer.tsx` - Renders content blocks
- **Page Editor**: `/components/custom-pages/page-editor.tsx` - Admin editing UI
- **Types**: `/lib/custom-pages/types.ts` - TypeScript definitions
- **About Route**: `/app/about/page.tsx` - About page implementation
- **Generic Route**: `/app/pages/[slug]/page.tsx` - Other custom pages
- **Seed Endpoint**: `/app/api/admin/seed-about-page/route.ts` - Populate initial data

## Design Principles

1. **Consistency**: All pages use the same block-based system
2. **Flexibility**: Mix and match text/image blocks in any order
3. **Editability**: All content changes via admin panel
4. **Accessibility**: Each image can have alt text, markdown support in text
5. **Performance**: Images use Next.js Image optimization when possible
6. **No 404s**: Pages show not-found only if database page doesn't exist

## Extending the System

To add new block types in the future:

1. Add type to `page_blocks.block_type` enum in database
2. Add case handler in `RenderBlock()` in page-renderer.tsx
3. Add input UI in page-editor.tsx
4. Test with a new page

---

**Status**: ✅ Unified template implemented
**Version**: 1.0
**Last Updated**: 2026-05-15
