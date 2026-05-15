# Quick Reference: Custom Pages Exact Template

## About Page - Exact Original Layout

The About page now matches the original exactly with these 5 blocks:

### Block Structure
```
1. Header Section (header_section format)
   └─ H1: "Welcome to the Wisdom at Work Fellows' Portal"
   └─ P1: "Congratulations and welcome to the Wisdom at Work Fellowship!"
   └─ P2: "This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources."

2. Image: Team Collaboration
   └─ Full-width with shadow

3. Prose Section (prose_section format)
   └─ 3 paragraphs of Lorem ipsum

4. Image: Curriculum (centered, 2/3 width)
   └─ Curriculum structure visual

5. Image: Foundation Logo (small, centered)
   └─ John Templeton Foundation logo
```

## Creating Custom Pages - Follow This Pattern

### Step 1: Create Page at `/admin/custom-pages`
- Title: Page name
- Slug: URL path (e.g., `mission`, `team`)
- Publish: YES

### Step 2: Add Blocks in This Order

**Block 1 - Header (if needed)**
```json
{
  "block_type": "text",
  "order_number": 1,
  "content": "Main Title\n\nSubtitle Line\n\nDescription Line",
  "metadata": { "format": "header_section" }
}
```

**Block 2-N - Content**
```json
{
  "block_type": "text",
  "order_number": 2,
  "content": "Para 1\n\nPara 2\n\nPara 3",
  "metadata": { "format": "prose_section" }
}
```

**Images - Any Position**
```json
{
  "block_type": "image",
  "order_number": 3,
  "content": "https://image-url.com/img.png",
  "metadata": {
    "alt": "Image description",
    "className": "w-full rounded-lg shadow-md",
    "section": "bg-background",
    "containerClass": "py-8 sm:py-12"
  }
}
```

## Metadata Quick Lookup

### Text Format Options
- `"format": "header_section"` → 3-part header (H1, P1, P2)
- `"format": "prose_section"` → Multiple paragraphs

### Image Size Options
- `"className": "w-full rounded-lg shadow-md"` → Full width
- `"className": "w-2/3 rounded-lg shadow-md mx-auto"` → 2/3 width, centered
- `"className": "h-32 w-auto inline-block"` → Logo size, centered

### Section Backgrounds
- `"section": "bg-background"` → Light background
- `"section": "border-b border-border bg-card"` → Card with bottom border
- `"section": "border-t border-border bg-card"` → Card with top border

### Container Padding
- `"containerClass": "py-8 sm:py-12"` → Standard spacing
- `"containerClass": "py-12 sm:py-16"` → Large spacing
- `"containerClass": "py-8 sm:py-12 text-center"` → Centered content

## Files to Know

| File | Purpose |
|------|---------|
| `/app/about/page.tsx` | About page route (auto-seeds if needed) |
| `/app/pages/[slug]/page.tsx` | Public custom pages route |
| `/components/custom-pages/page-renderer.tsx` | Renders all blocks with exact formatting |
| `/admin/custom-pages/[pageId]/page.tsx` | Admin editor for pages |
| `CUSTOM_PAGES_EXACT_TEMPLATE.md` | Full documentation |
| `ABOUT_PAGE_RESTORATION_SUMMARY.md` | What was fixed |

## Testing Your Page

1. Create page at `/admin/custom-pages`
2. Add 3-5 blocks following the template
3. Click Publish
4. Visit `/your-slug`
5. Admins can click "Edit page" to modify

## Consistency Checklist

Before publishing a page:
- [ ] Block 1 is header or intro section
- [ ] Images have descriptive alt text
- [ ] Sections alternate background colors
- [ ] Images have shadow and rounded corners
- [ ] Text uses serif fonts for headings
- [ ] Spacing is consistent (py-8/12)
- [ ] Page looks good on mobile (responsive)
- [ ] Call-to-action footer appears at bottom

