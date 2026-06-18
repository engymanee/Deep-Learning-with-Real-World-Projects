'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Layers, Lock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import {
  canFellowSeeContent,
  canFellowSeePhase,
  type ContentCategory,
} from '@/lib/curriculum'
import { isCohort, type Cohort } from '@/lib/cohorts'

interface PhaseRow {
  id: string
  title: string
  order_index: number
  cohorts: string[] | null
  /** Per-fellow flag: true when the phase is not assigned to the
   *  viewer's cohort. Privileged users always see `false`. */
  isLocked: boolean
}

interface ModuleRow {
  id: string
  phase_id: string
  cohorts: string[] | null
}

interface ContentRow {
  id: string
  year_id: string
  module_id: string | null
  category: ContentCategory | null
  cohorts: string[] | null
}

type Role = 'fellow' | 'facilitator' | 'admin' | null

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  /** Currently-active phase id (highlighted in nav). */
  currentYearId?: string
  /** Currently-active content item id (drives content-count badge style). */
  currentLabId?: string
}

/**
 * Curriculum sidebar.
 *
 * Displays every phase the viewer is allowed to see. Fellows are filtered
 * by their cohort; admins and facilitators always see the full curriculum.
 * Per the simplified phase -> content-item model there is no nested tree
 * inside the sidebar - clicking a phase navigates to its detail page,
 * which is where category-grouped content lives.
 */
export function Sidebar({
  isOpen = true,
  onClose,
  currentYearId,
  currentLabId: _currentLabId,
}: SidebarProps) {
  const [phases, setPhases] = useState<PhaseRow[]>([])
  const [counts, setCounts] = useState<Map<string, number>>(new Map())
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [
        { data: phaseRows },
        { data: moduleRows },
        { data: contentRows },
      ] = await Promise.all([
        supabase
          .from('years')
          .select('id, title, order_index, cohorts')
          .order('order_index', { ascending: true }),
        supabase
          .from('modules')
          .select('id, phase_id, cohorts'),
        supabase
          .from('labs')
          .select('id, year_id, module_id, category, cohorts'),
      ])

      let currentRole: Role = null
      let userCohort: Cohort | null = null

      if (user) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role, cohort')
          .eq('id', user.id)
          .maybeSingle<{ role: Role; cohort: string | null }>()
        currentRole = profileRow?.role ?? null
        userCohort = isCohort(profileRow?.cohort) ? profileRow!.cohort : null
      }

      if (cancelled) return

      const isFellowRole = currentRole === 'fellow'

      // Fellows still see every phase in the sidebar; ones that
      // their cohort isn't assigned to are flagged `isLocked` so
      // the row renders as a non-link gated entry rather than
      // disappearing.
      const visiblePhases: PhaseRow[] = (phaseRows ?? []).map((p) => ({
        id: p.id,
        title: p.title,
        order_index: p.order_index,
        cohorts: (p.cohorts as string[] | null) ?? null,
        isLocked: isFellowRole
          ? !canFellowSeePhase(p.cohorts as string[] | null, userCohort)
          : false,
      }))
      // Counts only consider unlocked phases - locked ones have no
      // accessible content for this viewer.
      const visiblePhaseIds = new Set(
        visiblePhases.filter((p) => !p.isLocked).map((p) => p.id),
      )

      // Tally per-phase content count using the full Phase -> Module
      // -> Content cascade. We delegate the visibility rule to the
      // shared helper so it stays in sync with server-side filtering.
      const phaseCohortById = new Map<string, string[] | null>()
      for (const p of phaseRows ?? []) {
        phaseCohortById.set(p.id, (p.cohorts as string[] | null) ?? null)
      }
      const moduleCohortById = new Map<string, string[] | null>()
      for (const m of (moduleRows ?? []) as ModuleRow[]) {
        moduleCohortById.set(m.id, m.cohorts)
      }

      const tally = new Map<string, number>()
      for (const item of (contentRows ?? []) as ContentRow[]) {
        if (!visiblePhaseIds.has(item.year_id)) continue
        if (!item.category) continue
        if (!item.module_id) continue
        if (isFellowRole) {
          const phaseCohorts = phaseCohortById.get(item.year_id) ?? null
          const moduleCohorts = moduleCohortById.get(item.module_id) ?? null
          if (
            !canFellowSeeContent(
              item.cohorts,
              phaseCohorts,
              userCohort,
              moduleCohorts,
            )
          ) {
            continue
          }
        }
        tally.set(item.year_id, (tally.get(item.year_id) ?? 0) + 1)
      }

      setPhases(visiblePhases)
      setCounts(tally)
      setRole(currentRole)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const isAdmin = role === 'admin'

  return (
    <aside
      className={cn(
        'fixed md:sticky top-16 left-0 bottom-0 w-80 bg-bg-subtle border-r border-border overflow-y-auto transition-transform duration-300 z-40',
        !isOpen && '-translate-x-full md:translate-x-0',
      )}
      aria-label="Program curriculum"
    >
      <div className="space-y-2 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-text">
            Curriculum
          </h3>
          {isAdmin && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent"
              title="Admin privileges active"
            >
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Admin
            </span>
          )}
        </div>

        {loading && (
          <div className="space-y-2" aria-hidden="true">
            <div className="h-9 animate-pulse rounded bg-bg-muted" />
            <div className="h-9 animate-pulse rounded bg-bg-muted" />
            <div className="h-9 animate-pulse rounded bg-bg-muted" />
          </div>
        )}

        {!loading && phases.length === 0 && (
          <div className="rounded-md border border-dashed border-border p-4 text-center">
            <Layers
              className="mx-auto mb-2 h-5 w-5 text-text-muted"
              aria-hidden="true"
            />
            <p className="text-xs text-text-muted">
              {isAdmin
                ? 'No phases yet. Create one in Manage curriculum.'
                : "No curriculum has been assigned to your cohort yet."}
            </p>
          </div>
        )}

        {!loading &&
          phases.map((phase, idx) => {
            const isCurrent = currentYearId === phase.id
            const count = counts.get(phase.id) ?? 0

            // Locked phases render as a non-clickable disabled row
            // with a small lock affordance instead of a count - so
            // fellows see the full curriculum spine, just gated.
            if (phase.isLocked) {
              return (
                <div
                  key={phase.id}
                  aria-disabled="true"
                  title="Not assigned to your cohort"
                  className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 text-sm text-text-muted opacity-70"
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-border/40 text-[10px] font-semibold text-text-muted"
                    aria-hidden="true"
                  >
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{phase.title}</span>
                  <Lock
                    className="h-3.5 w-3.5 shrink-0 text-text-muted"
                    aria-hidden="true"
                  />
                  <span className="sr-only">Locked</span>
                </div>
              )
            }

            return (
              <Link
                key={phase.id}
                // Phases no longer have a dedicated page - the dashboard's
                // collapsible curriculum tree owns browsing. Hash-link to
                // the right phase block; the tree opens it on hashchange.
                href={`/dashboard#phase-${phase.id}`}
                onClick={onClose}
                aria-current={isCurrent ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isCurrent
                    ? 'border-l-2 border-primary bg-white pl-2.5 font-medium text-primary'
                    : 'text-text hover:bg-border/40',
                )}
              >
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                  aria-hidden="true"
                >
                  {idx + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{phase.title}</span>
                <span className="shrink-0 text-[11px] text-text-muted">
                  {count}
                </span>
              </Link>
            )
          })}

        {!loading && isAdmin && (
          <div className="pt-3">
            <Link
              href="/admin/curriculum"
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-xs font-medium text-text-muted transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent"
            >
              Manage curriculum
            </Link>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-border p-4">
        <p className="text-center text-xs text-text-muted">
          Need help? Contact{' '}
          <a
            href="mailto:waw@abigailadamsinstitute.org"
            className="text-accent hover:underline"
          >
            waw@abigailadamsinstitute.org
          </a>
        </p>
      </div>
    </aside>
  )
}
