'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home } from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMMUNITY_SECTIONS } from '@/lib/community/sections'

/**
 * Persistent left-rail navigation for /community.
 *
 * Renders two faces:
 *   - Desktop (lg+): a sticky 14rem column with grouped links. Active row
 *     gets the muted-accent surface so the user always knows where they are.
 *   - Mobile: a horizontal scrollable pill row above the main column.
 *     Same routes, denser packaging.
 *
 * Both use `usePathname` to compute the active state. We treat any
 * descendant route (e.g. /community/bios/abc) as "still under bios"
 * so the row stays highlighted while you drill in.
 */
export function CommunitySidebar() {
  const pathname = usePathname()
  const overviewActive = pathname === '/community'

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        aria-label="Community navigation"
        className="hidden w-56 shrink-0 lg:block"
      >
        <div className="sticky top-20 flex flex-col gap-6">
          <Link
            href="/community"
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              overviewActive
                ? 'bg-muted text-foreground'
                : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
            )}
          >
            <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">Overview</span>
          </Link>

          <div>
            <p className="mb-2 px-3 text-xs font-medium tracking-wider text-muted-foreground">
              Community
            </p>
            <ul className="flex flex-col gap-0.5">
              {COMMUNITY_SECTIONS.map((s) => {
                const href = `/community/${s.slug}`
                const active = isActive(href)
                const Icon = s.icon

                return (
                  <li key={s.id}>
                    <Link
                      href={href}
                      className={cn(
                        'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                        active
                          ? 'bg-muted font-medium text-foreground'
                          : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span className="flex-1 truncate">{s.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </aside>

      {/* Mobile horizontal pill rail. Hidden on lg+ where the sidebar
          takes over. The horizontal scroll keeps every section
          reachable on narrow screens without a hamburger. */}
      <nav
        aria-label="Community sections"
        className="-mx-4 px-4 lg:hidden"
      >
        <ul className="flex gap-2 overflow-x-auto pb-2">
          <li>
            <Link
              href="/community"
              className={cn(
                'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                overviewActive
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-card text-foreground/80 hover:bg-muted',
              )}
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              Overview
            </Link>
          </li>
          {COMMUNITY_SECTIONS.map((s) => {
            const href = `/community/${s.slug}`
            const active = isActive(href)
            const Icon = s.icon
            return (
              <li key={s.id}>
                <Link
                  href={href}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                    active
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border bg-card text-foreground/80 hover:bg-muted',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {s.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
