# Abigail Adams Institute Brand Colors

## Color Palette

The WaW Learning Portal uses the Abigail Adams Institute brand color system to create a calm, classical, university-press aesthetic.

### Primary Brand Colors

| Token | Color | Use |
|-------|-------|-----|
| `--color-navy` | #274d80 | Headers, buttons, links, primary UI elements |
| `--color-parchment` | #faf7f2 | Card backgrounds, content surfaces, lesson body |
| `--color-paper` | #fefefe | Main canvas background |
| `--color-ink` | #1a2f4f | Body text, deep navy for reading |
| `--color-navy-muted` | #6b86ad | Secondary text, inactive states, borders |
| `--color-navy-tint` | #e8eef5 | Subtle fills, hover states |

### Accent Colors

| Token | Color | Use |
|-------|-------|-----|
| `--color-crimson` | #bb4658 | Progress indicators, current state, live indicators, accent CTAs |
| `--color-crimson-soft` | #f4e2e4 | Crimson background fills for badges, highlights |

### Functional Colors

| Token | Color | Use |
|-------|-------|-----|
| `--success` | #4a7c59 | Success states, completion indicators |
| `--warning` | #c68b3c | Warning states, caution indicators |
| `--error` | #a13d3d | Error states, destructive actions |

## Usage Rules

1. **Navy is dominant** - Use for primary buttons, headings, top navigation, links
2. **Paper and Parchment create hierarchy** - Paper is the page canvas, parchment is content surfaces
3. **Crimson is reserved** - Use sparingly for progress, current indicators, single accent CTA
4. **Borders use navy opacity** - Never use gray; apply navy with opacity instead

## CSS Variables

All colors are available as CSS custom properties in `app/globals.css`:

```css
background-color: var(--color-navy);
color: var(--color-ink);
border: 1px solid var(--border-default);
```

## Tailwind Classes

All colors are mapped to Tailwind utilities through the CSS variables:

```jsx
<div className="bg-primary text-foreground border border-border">
  Navy background with ink text and navy border
</div>
```

## Typography

The portal uses three serif fonts for a classical aesthetic:

- **Cardo** - Body text and long-form reading
- **Vollkorn** - Headings and structural text
- **Alegreya SC** - Small-caps labels and emphasis

Inter (sans-serif) is reserved for UI labels under 14px only.

## Logo

The Abigail Adams Institute logo is used in the top navigation bar at `/aai-logo.jpg` (32x32px recommended).
