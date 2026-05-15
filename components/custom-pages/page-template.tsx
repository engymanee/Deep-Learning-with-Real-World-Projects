interface CustomPageTemplateProps {
  metadata?: {
    title: string
    description?: string
  }
  children: React.ReactNode
}

/**
 * Reusable template for custom pages that matches the About page layout exactly.
 * Wraps content with consistent spacing and styling structure.
 * Note: TopBar and Footer are provided by the pages layout, not by this template.
 */
export function CustomPageTemplate({ metadata, children }: CustomPageTemplateProps) {
  return (
    <main className="w-full">
      {children}
    </main>
  )
}
