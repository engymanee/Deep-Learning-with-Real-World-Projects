'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CompletionRadio } from './completion-radio'
import type { CurriculumPhase } from '@/lib/curriculum-tree'

interface Props {
  phases: CurriculumPhase[]
}

function formatDuration(mins: number | null): string | null {
  if (!mins || mins <= 0) return null
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

/**
 * Fully collapsible curriculum tree. Phases collapse to show modules,
 * modules collapse to show content items. Only content items are
 * navigable links - phase and module headers are pure expand/collapse
 * toggles.
 *
 * Layout (mirrors the design brief):
 *   <Phase title>                              <-- toggle
 *     1. Module title                          <-- toggle
 *        [radio]  Item title
 *                 55min
 *        [radio]  Item title
 *                 20min
 *     2. Module title                          <-- toggle
 *
 * The first phase is open on first paint so fellows immediately see
 * something. When the URL hash points at a phase (#phase-{id}) we
 * expand and scroll to it - that's how the global sidebar's phase
 * links route to the dashboard tree.
 */
export function CurriculumTree({ phases }: Props) {
  const pathname = usePathname()

  // Derive the active item from the path (works when the tree lives
  // alongside a content viewer, though today it only renders on the
  // dashboard).
  const activeItemId = useMemo(() => {
    const match = pathname?.match(
      /^\/phases\/[^/]+\/modules\/[^/]+\/items\/([^/]+)/,
    )
    return match?.[1] ?? null
  }, [pathname])

  // Open-state is keyed by id so phases and modules share the same
  // Set. Strings collide-free because uuids never look like one
  // another.
  const initialOpen = useMemo(() => {
    const set = new Set<string>()
    if (phases.length > 0) {
      const first = phases[0]
      set.add(first.id)
      // Open the first module too so the very first paint shows the
      // same hierarchy as the design brief.
      if (first.modules.length > 0) set.add(first.modules[0].id)
    }
    return set
  }, [phases])

  const [openIds, setOpenIds] = useState<Set<string>>(initialOpen)

  // Auto-expand the phase + module that contain the active item.
  // Runs whenever the URL changes (back/forward, deep-link, or
  // sibling navigation in the layout) so the user always sees
  // their place in the tree. Wrapped in setOpenIds(prev=>...) so
  // we never clobber phases the user has manually expanded.
  useEffect(() => {
    if (!activeItemId) return
    for (const phase of phases) {
      for (const mod of phase.modules) {
        if (mod.items.some((it) => it.id === activeItemId)) {
          setOpenIds((prev) => {
            if (prev.has(phase.id) && prev.has(mod.id)) return prev
            const next = new Set(prev)
            next.add(phase.id)
            next.add(mod.id)
            return next
          })
          return
        }
      }
    }
  }, [activeItemId, phases])

  // If the URL hash points at a phase (e.g. #phase-abc), open and
  // scroll to it. Runs once after mount and any time the hash
  // changes - used by deep-links from the global sidebar.
  useEffect(() => {
    function applyHash() {
      const hash = window.location.hash.replace(/^#/, '')
      if (!hash) return
      const phaseMatch = hash.match(/^phase-(.+)$/)
      if (!phaseMatch) return
      const phaseId = phaseMatch[1]
      setOpenIds((prev) => {
        if (prev.has(phaseId)) return prev
        const next = new Set(prev)
        next.add(phaseId)
        return next
      })
      // Defer scroll so the phase is rendered open first.
      requestAnimationFrame(() => {
        document
          .getElementById(`phase-${phaseId}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    applyHash()
    window.addEventListener('hashchange', applyHash)
    return () => window.removeEventListener('hashchange', applyHash)
  }, [])

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (phases.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
        No curriculum is available yet.
      </p>
    )
  }

  return (
    <nav aria-label="Curriculum" className="flex flex-col gap-3">
      {phases.map((phase) => {
        const phaseOpen = openIds.has(phase.id)
        return (
          <section
            key={phase.id}
            id={`phase-${phase.id}`}
            className="rounded-lg border border-border bg-card"
          >
            {/* Phase header (collapse toggle, not a link) */}
            <button
              type="button"
              onClick={() => toggle(phase.id)}
              aria-expanded={phaseOpen}
              aria-controls={`phase-${phase.id}-body`}
              className="flex w-full items-center justify-between gap-3 rounded-lg px-5 py-4 text-left transition-colors hover:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <h3 className="font-serif text-xl leading-tight text-foreground">
                  {phase.title}
                </h3>
                {phase.description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {phase.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                {phase.itemCount > 0 && (
                  <span>
                    {phase.completedCount}/{phase.itemCount}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    phaseOpen ? 'rotate-0' : '-rotate-90',
                  )}
                  aria-hidden="true"
                />
              </div>
            </button>

            {phaseOpen && (
              <div
                id={`phase-${phase.id}-body`}
                className="border-t border-border px-3 pb-3 pt-2"
              >
                {phase.modules.length === 0 ? (
                  <p className="px-2 py-4 text-center text-sm italic text-muted-foreground">
                    No modules yet.
                  </p>
                ) : (
                  <ul className="flex flex-col">
                    {phase.modules.map((module, idx) => {
                      const moduleOpen = openIds.has(module.id)
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
                            aria-expanded={moduleOpen}
                            aria-controls={`module-${module.id}`}
                            className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/60"
                          >
                            <span className="min-w-0 truncate">
                              {headerLabel}
                            </span>
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
                                moduleOpen ? 'rotate-0' : '-rotate-90',
                              )}
                              aria-hidden="true"
                            />
                          </button>

                          {moduleOpen && (
                            <ul
                              id={`module-${module.id}`}
                              className="flex flex-col pb-2"
                            >
                              {module.items.length === 0 ? (
                                <li className="px-3 py-3 text-xs italic text-muted-foreground">
                                  No content yet.
                                </li>
                              ) : (
                                module.items.map((item) => {
                                  const isActive = activeItemId === item.id
                                  const duration = formatDuration(
                                    item.durationMinutes,
                                  )
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
              </div>
            )}
          </section>
        )
      })}
    </nav>
  )
}
