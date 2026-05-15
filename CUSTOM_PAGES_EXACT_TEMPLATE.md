# Custom Pages Exact Template Guide

## Overview

All custom pages (including `/about`) now follow the **exact same template and layout pattern** based on the original About page structure. This ensures visual and functional consistency across all custom pages.

## Standard Page Layout Structure

Every custom page follows this identical structure:

```
1. Welcome/Header Section (border-b, bg-card)
   - H1 Heading
   - P1 Secondary text (medium weight)
   - P2 Descriptive text (muted)

2. Image Section (bg-background)
   - Full-width image with shadow and rounded corners

3. Content Section (border-b, bg-card)
   - Main prose content (multiple paragraphs)
   - Uses typography: prose-sm, max-w-none

4. Secondary Image Section (bg-background)
   - Centered image with custom width/sizing

5. Attribution/Footer Section (border-t, bg-card)
   - Logo or footer image
   - Centered alignment

6. Call-to-Action Footer (border-t, bg-background)
   - Button to dashboard
   - Maintains consistent styling
```

## Block Types and Metadata

### Text Blocks

#### Header Section Format
```json
{
  "block_type": "text",
  "order_number": 1,
  "content": "H1 Text\n\nP1 Text\n\nP2 Text",
  "metadata": {
    "format": "header_section"
  }
}
```

**Renders as:**
- Section with `border-b border-border bg-card`
- H1: `font-serif text-3xl sm:text-4xl font-bold mb-4 text-center`
- P1: `text-lg font-medium mb-3 text-center`
- P2: `text-base text-muted-foreground leading-relaxed text-center`

#### Prose Section Format
```json
{
  "block_type": "text",
  "order_number": 3,
  "content": "Paragraph 1\n\nParagraph 2\n\nParagraph 3",
  "metadata": {
    "format": "prose_section"
  }
}
```

**Renders as:**
- Section with `border-b border-border bg-card`
- Content: `prose prose-sm max-w-none space-y-4 text-muted-foreground`
- Automatically splits on `\n\n` (double newlines)

### Image Blocks

All image blocks use consistent structure:

```json
{
  "block_type": "image",
  "order_number": 2,
  "content": "https://image-url.com/image.png",
  "metadata": {
    "alt": "Image description",
    "className": "w-full rounded-lg shadow-md",
    "section": "bg-background",
    "containerClass": "py-8 sm:py-12"
  }
}
```

#### Common Image Configurations

**Full-width image:**
```json
{
  "className": "w-full rounded-lg shadow-md",
  "section": "bg-background",
  "containerClass": "py-8 sm:py-12"
}
```

**Two-thirds width centered image:**
```json
{
  "className": "w-2/3 rounded-lg shadow-md mx-auto",
  "section": "bg-background",
  "containerClass": "py-8 sm:py-12 text-center text-sm"
}
```

**Logo/small centered image:**
```json
{
  "className": "h-32 w-auto inline-block",
  "section": "border-t border-border bg-card",
  "containerClass": "py-12 sm:py-16 text-center",
  "style": { "fontSize": "20px" }
}
```

## About Page Example

The About page demonstrates the exact template:

### Block 1: Header Section
- H1: "Welcome to the Wisdom at Work Fellows' Portal"
- P1: "Congratulations and welcome to the Wisdom at Work Fellowship!"
- P2: "This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources."

### Block 2: Team Image
- URL: `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-yk9hNgyQQIeZ2sMEpmaQzrCr1BlN8x.png`
- Full-width image on background

### Block 3: Lorem Ipsum Text
- Three paragraphs of prose content
- Rendered with prose styling

### Block 4: Curriculum Image
- URL: `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Q4wysyC8JWLi02dGNyrSqptIHF6gYQ.png`
- Two-thirds width, centered

### Block 5: Foundation Logo
- URL: `https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png`
- Logo-sized, on card background

## Creating New Custom Pages

When creating a new custom page, follow this checklist:

1. **Visit** `/admin/custom-pages`
2. **Click** "Create New Page"
3. **Fill in:**
   - Title: Page title
   - Slug: URL-friendly slug (e.g., `about`, `mission`, `team`)
   - Description: Optional (appears in description section if set)

4. **Add Content Blocks in order:**
   - Block 1: Header section (if needed) - use `format: 'header_section'` metadata
   - Block 2-N: Alternating content blocks
   - Last: Image or footer content

5. **Set Block Metadata** for images:
   - `alt`: Descriptive text for accessibility
   - `className`: CSS classes for image sizing/styling
   - `section`: Container background class
   - `containerClass`: Container padding/sizing

6. **Publish** the page

7. **Visit** `/your-slug` to view

## Color and Spacing Standards

All custom pages use consistent design:

- **Background**: `bg-background`
- **Cards**: `bg-card` with `border-border` borders
- **Typography**: 
  - Headings: `font-serif` with appropriate sizes
  - Body: `text-foreground` or `text-muted-foreground`
- **Spacing**: 
  - Standard: `py-8 sm:py-12`
  - Large sections: `py-12 sm:py-16`
  - Images: `py-8 sm:py-12` with `px-4`
- **Borders**: 
  - Between sections: `border-b border-border` or `border-t border-border`
  - Rounded images: `rounded-lg`
  - Shadows: `shadow-md`

## Page Renderer Support

The `PageRenderer` component (`components/custom-pages/page-renderer.tsx`) handles:

- ✓ Text blocks with special formats (header_section, prose_section)
- ✓ Image blocks with metadata-driven styling
- ✓ Automatic section backgrounds and spacing
- ✓ Proper typography and color contrast
- ✓ Responsive design (mobile-first)
- ✓ Call-to-action footer (when `showCTA={true}`)

## For Admins

All custom pages are editable at `/admin/custom-pages`:

- Create new pages with the standard template
- Edit existing page content
- Reorder blocks
- Change images
- Publish/unpublish pages
- Add to menu navigation

The inline editor is also available for published pages at the page URL itself.

## Consistency Checklist

When reviewing custom pages, ensure:

- [ ] All sections use appropriate `bg-card` or `bg-background`
- [ ] Image alt text is descriptive and meaningful
- [ ] Headings use `font-serif` classes
- [ ] Spacing is consistent (`py-8 sm:py-12` or `py-12 sm:py-16`)
- [ ] Borders appear between sections as expected
- [ ] Images have rounded corners and shadows
- [ ] Typography colors match (heading, body, muted)
- [ ] Page renders correctly on mobile and desktop
- [ ] Call-to-action footer is present and functional

