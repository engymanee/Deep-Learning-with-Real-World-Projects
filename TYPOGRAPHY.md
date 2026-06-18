# Typography & Font Usage Guide

## AAI Brand Fonts

The Wisdom at Work Portal now uses the Abigail Adams Institute's official typography system for full brand alignment.

### Font Variables

All fonts are available as CSS variables in `globals.css`:

```css
--font-serif: 'Vollkorn', serif;        /* Headings, body text */
--font-sans: 'Alegreya SC', serif;      /* Labels, navigation, secondary text */
--font-mono: 'JetBrains Mono', ...;     /* Code blocks */
```

### Using Fonts in Components

#### Headings (Vollkorn Serif)
```tsx
// Automatically applied via globals.css
<h1>Welcome to the Fellowship</h1>           {/* font-serif */}
<h2>Section Title</h2>                        {/* font-serif */}

// Or explicitly in Tailwind:
<div className="font-serif text-2xl">Title</div>
```

#### Body Text (Alegreya SC for labels/nav)
```tsx
// Small caps labels - use font-sans
<span className="font-sans">COMMUNITY</span>     {/* Alegreya SC */}

// Regular body text - use font-sans
<p className="font-sans">Read more content...</p>  {/* Alegreya SC */}

// Semantic HTML automatically uses font-sans
<p>This uses Alegreya SC by default</p>
```

#### Code (Monospace)
```tsx
<code className="font-mono">const x = 42;</code>
```

## Tailwind Classes

All Tailwind text utilities work with the font stack:

```tsx
// Font families
className="font-serif"      // Vollkorn
className="font-sans"       // Alegreya SC
className="font-mono"       // JetBrains Mono

// Sizes
className="text-sm"         // 0.875rem (14px)
className="text-base"       // 1rem (16px)
className="text-lg"         // 1.125rem (18px)
className="text-xl"         // 1.25rem (20px)
className="text-2xl"        // 1.5rem (24px)
className="text-3xl"        // 1.875rem (30px)
className="text-4xl"        // 2.25rem (36px)

// Font weights
className="font-normal"     // 400
className="font-medium"     // 500
className="font-semibold"   // 600
className="font-bold"       // 700

// Line heights
className="leading-tight"   // 1.25
className="leading-snug"    // 1.375 (preferred for headings)
className="leading-relaxed" // 1.625 (body text)
className="leading-loose"   // 1.875

// Text alignment
className="text-left"
className="text-center"
className="text-right"
className="text-justify"

// Text color
className="text-foreground"        // Primary text (#1a2f4f)
className="text-muted-foreground"  // Secondary text (#6b86ad)
```

## Component Typography Examples

### Page Title
```tsx
<h1 className="font-serif text-4xl font-bold leading-snug text-primary">
  Page Title
</h1>
```

### Section Heading
```tsx
<h2 className="font-serif text-3xl font-bold leading-snug text-primary">
  Section Title
</h2>
```

### Label or Navigation
```tsx
<span className="font-sans text-xs font-medium uppercase tracking-wider text-muted-foreground">
  COMMUNITY
</span>
```

### Body Paragraph
```tsx
<p className="font-sans leading-relaxed text-foreground">
  This is body text in Alegreya SC with relaxed line-height for readability.
</p>
```

### Small Text / Secondary
```tsx
<p className="font-sans text-sm text-muted-foreground">
  Secondary information or metadata
</p>
```

## Global Typography Rules (CSS)

From `app/globals.css`:

```css
body {
  @apply bg-background text-foreground font-sans leading-relaxed;
}

h1, h2, h3, h4, h5, h6 {
  @apply font-serif font-bold text-primary;
}

h1 { @apply text-4xl leading-snug; }
h2 { @apply text-3xl leading-snug; }
h3 { @apply text-2xl leading-snug; }
h4 { @apply text-xl leading-snug; }
h5, h6 { @apply text-lg leading-snug; }

a {
  @apply text-accent hover:text-primary-light transition-colors 
         underline decoration-2 underline-offset-2;
}

a:focus-visible {
  @apply outline-2 outline-offset-2 outline-primary rounded;
}
```

## Line Height Guidelines

- **Headings**: `leading-snug` (1.375) - tight but readable
- **Body text**: `leading-relaxed` (1.625) - optimal for sustained reading
- **UI labels**: `leading-tight` (1.25) - compact for navigation/buttons
- **Code blocks**: `leading-relaxed` - improves code readability

## Font Weights

- **Normal text**: 400 (Regular)
- **Emphasis**: 500-600 (Medium/Semibold)
- **Headings**: 700 (Bold)
- **Overline/labels**: 500-700 depending on hierarchy

## Accessibility Considerations

1. **Contrast**: All text meets WCAG AA standards (minimum 4.5:1 for body text)
2. **Size**: Minimum 14px (font-sm) for body text, never below 12px
3. **Line spacing**: Minimum 1.375 for comfortable reading
4. **Font clarity**: Vollkorn and Alegreya SC are both highly legible serif fonts
5. **Responsive**: Font sizes remain consistent on mobile for accessibility

## Mobile Responsiveness

Current font sizes are consistent across breakpoints. To make them responsive:

```tsx
// Example: larger on desktop
<h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
```

## Performance Notes

- Fonts load with `display: 'swap'` in layout.tsx
- Provides fallback to serif fonts immediately while Vollkorn/Alegreya load
- All fonts are subset to Latin characters for optimal file size
- Font loading is monitored in Lighthouse audits

## Testing Typography

1. **Visual verification**: All headings use Vollkorn, all body text uses Alegreya SC
2. **Size hierarchy**: H1 > H2 > H3 > body text is visually obvious
3. **Contrast**: Use browser dev tools color picker to verify contrast ratios
4. **Responsive**: Test on mobile, tablet, desktop to ensure readability
5. **Screen reader**: Verify heading hierarchy is semantic
