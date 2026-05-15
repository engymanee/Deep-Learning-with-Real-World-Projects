# Flexible Heading Positioning Feature

## Overview

Custom pages now support flexible positioning for up to 3 headings (H1, H2, H3). Each heading can be placed:
- **Before blocks** - Display at the top of the page before content blocks
- **After blocks** - Display at the bottom of the page after all content blocks
- **Hidden** - Don't display this heading

## How It Works

### For Page Editors (Admin)

1. Go to `/admin/custom-pages/[pageId]`
2. In the **Page Headers** section, you'll see three heading inputs:
   - Header 1 (Largest)
   - Header 2 (Medium)
   - Header 3 (Small)
3. For each heading, select its **Position**:
   - `Before blocks` - Shows at top
   - `After blocks` - Shows after content
   - `Hidden` - Not displayed

### For Page Visitors (Public)

When viewing a published custom page:
1. If headers are positioned "before", they display in size order (H1 → H2 → H3) at the top
2. Content blocks render in the middle
3. If headers are positioned "after", they display in size order at the bottom
4. Hidden headers don't appear anywhere

## Example Layouts

### Layout 1: Welcome Header + Content + Closing Thought
- Header 1 (Before): "Welcome to our program"
- Content blocks: Text and images
- Header 3 (After): "Thank you for joining us"

### Layout 2: Top Only (Classic)
- Header 1 (Before): "Main Title"
- Header 2 (Before): "Subtitle"
- Content blocks: All content
- Header 3 (Hidden): Not shown

### Layout 3: Mixed Positioning
- Header 1 (Hidden): Not shown
- Header 2 (Before): "Program Details"
- Content blocks
- Header 3 (After): "Questions?"

## Technical Details

### Database Schema
Headers now have optional position fields:
- `header1_position: 'before' | 'after' | 'hidden'` (default: 'before')
- `header2_position: 'before' | 'after' | 'hidden'` (default: 'before')
- `header3_position: 'before' | 'after' | 'hidden'` (default: 'before')

### Type Definition
```typescript
export type HeaderPosition = 'before' | 'after' | 'hidden'

export interface CustomPage {
  header1: string | null
  header1_position?: HeaderPosition
  header2: string | null
  header2_position?: HeaderPosition
  header3: string | null
  header3_position?: HeaderPosition
  // ... other fields
}
```

## Component Updates

1. **PageEditor Component**
   - Added position dropdown for each header
   - Defaulting to 'before' when creating new pages
   - Position updates sync immediately with page state

2. **PageRenderer Component**
   - Created `renderHeader()` helper function for consistent styling
   - Renders headers before blocks, then blocks, then headers after blocks
   - Respects 'hidden' setting to skip rendering

## Styling

All headers maintain consistent styling:
- **Large (H1)**: `text-4xl sm:text-5xl` - serif font, bold, centered
- **Medium (H2)**: `text-2xl sm:text-3xl` - serif font, bold, centered
- **Small (H3)**: `text-lg sm:text-xl` - serif font, bold, centered

Headers use the same background/border styling as the /about page for visual consistency.
