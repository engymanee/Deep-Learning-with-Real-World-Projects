'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight, Home } from 'lucide-react'

export function AdminBreadcrumb() {
  const pathname = usePathname()
  
  // Remove /admin prefix and split the path
  const path = pathname.replace('/admin', '') || '/'
  const segments = path.split('/').filter(Boolean)

  // Build breadcrumb items
  const items: Array<{ label: string; href: string }> = [
    { label: 'Dashboard', href: '/admin' },
  ]

  let currentPath = '/admin'
  for (const segment of segments) {
    currentPath += `/${segment}`
    const label = formatLabel(segment)
    items.push({ label, href: currentPath })
  }

  // If we're on a detail page (has id), remove the last breadcrumb and update the previous
  if (segments.length > 1 && isUUID(segments[segments.length - 1])) {
    const parentLabel = items[items.length - 2]?.label
    items.pop() // Remove UUID breadcrumb
    if (parentLabel) {
      items[items.length - 1].label = parentLabel
    }
  }

  return (
    <nav className="flex items-center gap-2 text-sm mb-6 px-1">
      {items.map((item, index) => (
        <div key={item.href} className="flex items-center gap-2">
          {index === 0 ? (
            <Link
              href={item.href}
              className="flex items-center gap-1.5 hover:text-primary transition-colors text-muted-foreground hover:text-foreground"
              title="Back to Dashboard"
            >
              <Home className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors text-muted-foreground"
            >
              {item.label}
            </Link>
          )}

          {index < items.length - 1 && (
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
      ))}
    </nav>
  )
}

function formatLabel(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
}
