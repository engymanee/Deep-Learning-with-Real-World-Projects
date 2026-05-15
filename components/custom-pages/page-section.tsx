interface PageSectionProps {
  variant?: 'card' | 'background'
  hasBorderTop?: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Reusable section component that matches the About page styling.
 * Provides consistent spacing, backgrounds, and border styling.
 */
export function PageSection({
  variant = 'background',
  hasBorderTop = false,
  children,
  className = '',
}: PageSectionProps) {
  const baseClass = 'bg-background'
  const cardClass = 'border-b border-border bg-card'
  const sectionClass = variant === 'card' ? cardClass : baseClass
  const borderClass = hasBorderTop ? 'border-t border-border' : ''
  const defaultPadding = className.includes('py-') ? '' : 'py-8 sm:py-12'

  return (
    <section className={`${sectionClass} ${borderClass}`}>
      <div className={`mx-auto max-w-4xl px-4 ${defaultPadding} ${className}`}>{children}</div>
    </section>
  )
}
