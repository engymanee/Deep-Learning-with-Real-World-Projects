'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletionRadio } from './completion-radio'
import type { CurriculumTree } from '@/lib/curriculum-tree'

interface Props {
  tree: CurriculumTree
}

function formatDuration(mins: number | null): string | null {
  if (!mins || mins <= 0) return null
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/**
 * Numbered, collapsible curriculum tree.
 *
 * Layout (mirrors the design brief):
 *   Phase title at top.
 *   For each module:
 *     - Header row: "1. Module title"        (chevron toggles open/closed)
 *     - Body:       list of content items, each row has:
 *                     [radio]  Title
 *                              {duration}
 *
 * The currently-selected item gets a soft grey background and a
 * filled radio. Clicking the radio toggles completion (without
 * navigating). Clicking anywhere else on the row navigates to the
 * item. Modules expand/collapse on click; the active module is
 * expanded by default.
 */
export function CurriculumTree({ tree }: Props) {
  const pathname = usePathname()

  // Detect active module + item from the current pathname so this tree
  // works in a layout shared across phase / module / item pages.
  const { activeModuleId, activeItemId } = useMemo(() => {
    const match = pathname?.match(
      /^\/phases\/[^/]+\/modules\/([^/]+)(?:\/items\/([^/]+))?/,
    )
    return {
      activeModuleId: match?.[1] ?? null,
      activeItemId: match?.[2] ?? null,
    }
  }, [pathname])

  // Default-open the active module; otherwise open the first one so
  // the tree never appears completely collapsed.
  const initialOpen = useMemo(() => {
    if (activeModuleId) return new Set([activeModuleId])
    if (tree.modules.length > 0) return new Set([tree.modules[0].id])
    return new Set<string>()
  }, [activeModuleId, tree.modules])

  const [openIds, setOpenIds] = useState<Set<string>>(initialOpen)

  // When navigation changes the active module, ensure it's open. We
  // never auto-close anything the user has expanded - just additive.
  useEffect(() => {
    if (!activeModuleId) return
    setOpenIds((prev) => {
      if (prev.has(activeModuleId)) return prev
      const next = new Set(prev)
      next.add(activeModuleId)
      return next
    })
  }, [activeModuleId])

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <nav aria-label="Curriculum" className="flex flex-col gap-2">
      {/* Phase header */}
      <div className="px-1 pb-3">
        <Link
          href={tree.phase.href}
          className="font-serif text-2xl leading-tight text-foreground hover:underline"
        >
          {tree.phase.title}
        </Link>
        {tree.phase.description && (
          <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {tree.phase.description}
          </p>
        )}
      </div>

      {tree.modules.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          No modules yet.
        </p>
      ) : (
        <ul className="flex flex-col">
          {tree.modules.map((module, idx) => {
            const isOpen = openIds.has(module.id)
            const headerLabel = `${idx + 1}. ${module.title}`
            return (
              <li
                key={module.id}
                className="border-t border-border first:border-t-0"
              >
                {/* Module header */}
                <button
                  type="button"
                  onClick={() => toggle(module.id)}
                  aria-expanded={isOpen}
                  aria-controls={`module-${module.id}`}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/60',
                    activeModuleId === module.id && 'bg-muted/40',
                  )}
                >
                  <span className="min-w-0 truncate">{headerLabel}</span>
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                      isOpen ? 'rotate-0' : '-rotate-90',
                    )}
                    aria-hidden="true"
                  />
                </button>

                {/* Module body */}
                {isOpen && (
                  <ul id={`module-${module.id}`} className="flex flex-col pb-2">
                    {module.items.length === 0 ? (
                      <li className="px-3 py-3 text-xs italic text-muted-foreground">
                        No content yet.
                      </li>
                    ) : (
                      module.items.map((item) => {
                        const isActive = activeItemId === item.id
                        const duration = formatDuration(item.durationMinutes)
                        return (
                          <li key={item.id}>
                            <Link
                              href={item.href}
                              className={cn(
                                'flex items-start gap-3 rounded-md px-3 py-2.5 transition-colors',
                                isActive
                                  ? 'bg-muted'
                                  : 'hover:bg-muted/40',
                              )}
                            >
                              <span className="mt-0.5">
                                <CompletionRadio
                                  contentId={item.id}
                                  isCompleted={item.isCompleted}
                                  itemTitle={item.title}
                                />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span
                                  className={cn(
                                    'block text-sm leading-snug text-foreground',
                                    isActive && 'font-medium',
                                  )}
                                >
                                  {item.title}
                                </span>
                                {duration && (
                                  <span className="mt-0.5 block text-xs text-muted-foreground">
                                    {duration}
                                  </span>
                                )}
                              </span>
                            </Link>
                          </li>
                        )
                      })
                    )}
                  </ul>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
