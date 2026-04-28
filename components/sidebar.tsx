'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Lock, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { fellowCanAccess, isCohort, type Cohort } from '@/lib/cohorts'

interface YearRow {
  id: string
  title: string
  order_index: number
  cohorts: string[] | null
}

interface LabRow {
  id: string
  year_id: string
  cohorts: string[] | null
  category: string | null
  resource_type: string | null
}

interface LabProgressRow {
  lab_id: string
  status: string | null
}

interface YearProgressRow {
  year_id: string
  status: 'locked' | 'in_progress' | 'complete'
}

type Role = 'fellow' | 'facilitator' | 'admin' | null

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  /** ID of the currently-viewed phase, used to highlight its row. */
  currentYearId?: string
}

/**
 * Curriculum sidebar.
 *
 * Phases are the only navigable level - clicking a phase opens
 * `/phases/[id]`, where content items are grouped by category and
 * rendered inline. Fellows see a lock for any phase that hasn't been
 * unlocked, and a completion fraction (items complete / total)
 * computed against the cohort-filtered item list. Admins and
 * facilitators see every phase unlocked, and (admins only) get a
 * shortcut into the curriculum manager.
 */
export function Sidebar({ isOpen = true, onClose, currentYearId }: SidebarProps) {
  const [years, setYears] = useState<YearRow[]>([])
  const [labs, setLabs] = useState<LabRow[]>([])
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [unlockedYears, setUnlockedYears] = useState<Set<string>>(new Set())
  const [role, setRole] = useState<Role>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const supabase = createClient()

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const [{ data: yearsData }, { data: labsData }] = await Promise.all([
        supabase
          .from('years')
          .select('id, title, order_index, cohorts')
          .order('order_index', { ascending: true }),
        supabase
          .from('labs')
          .select('id, year_id, cohorts, category, resource_type')
          .order('order_index', { ascending: true }),
      ])

      let currentRole: Role = null
      let userCohort: Cohort | null = null
      let yearProgress: YearProgressRow[] = []
      let labProgress: LabProgressRow[] = []

      if (user) {
        const [{ data: profileRow }, { data: yp }, { data: lp }] = await Promise.all([
          supabase
            .from('profiles')
            .select('role, cohort')
            .eq('id', user.id)
            .maybeSingle<{ role: Role; cohort: string | null }>(),
          supabase
            .from('user_year_progress')
            .select('year_id, status')
            .eq('profile_id', user.id),
          supabase
            .from('user_lab_progress')
            .select('lab_id, status')
            .eq('profile_id', user.id),
        ])
        currentRole = profileRow?.role ?? null
        userCohort = isCohort(profileRow?.cohort) ? profileRow!.cohort : null
        yearProgress = (yp ?? []) as YearProgressRow[]
        labProgress = (lp ?? []) as LabProgressRow[]
      }

      if (cancelled) return

      // Fellows only see phases / items whose cohort gating allows them.
      // Admins and facilitators see the full curriculum so they can
      // navigate any cohort's content from the sidebar.
      const isFellowRole = currentRole === 'fellow'
      const visibleYears = (yearsData ?? []).filter((y) =>
        !isFellowRole ? true : fellowCanAccess(y.cohorts as string[] | null, userCohort),
      )
      const visibleYearIds = new Set(visibleYears.map((y) => y.id))
      const visibleLabs = (labsData ?? []).filter((l) => {
        if (!visibleYearIds.has(l.year_id)) return false
        // Drop legacy items that pre-date the typed schema.
        if (!l.category || !l.resource_type) return false
        if (!isFellowRole) return true
        return fellowCanAccess(l.cohorts as string[] | null, userCohort)
      })

      setYears(visibleYears)
      setLabs(visibleLabs)
      setRole(currentRole)
      setCompleted(
        new Set(
          labProgress.filter((p) => p.status === 'complete').map((p) => p.lab_id),
        ),
      )

      // Admins / facilitators get every phase unlocked. Fellows unlock
      // the first phase automatically; each subsequent phase only opens
      // once the preceding one has a complete record (or the fellow
      // already has a non-locked row for it).
      const unlocked = new Set<string>()
      if (currentRole === 'admin' || currentRole === 'facilitator') {
        visibleYears.forEach((y) => unlocked.add(y.id))
      } else {
        const progressByYear = new Map(yearProgress.map((p) => [p.year_id, p.status]))
        let previousComplete = true
        for (const y of visibleYears) {
          const status = progressByYear.get(y.id)
          const isUnlocked =
            previousComplete || status === 'in_progress' || status === 'complete'
          if (isUnlocked) unlocked.add(y.id)
          previousComplete = status === 'complete'
        }
      }
      setUnlockedYears(unlocked)

      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const isAdmin = role === 'admin'
  const isFellow = role === 'fellow'

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
          <h3 className="text-sm font-semibold uppercase tracking-wide text-text">
            Program curriculum
          </h3>
          {isAdmin && (
            <span
              className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent"
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

        {!loading &&
          years.map((year) => {
            const yearLabs = labs.filter((l) => l.year_id === year.id)
            const totalItems = yearLabs.length
            const completedItems = yearLabs.filter((l) => completed.has(l.id)).length
            const isUnlocked = unlockedYears.has(year.id)
            const isLocked = !isUnlocked
            const isCurrent = currentYearId === year.id

            const row = (
              <div
                className={cn(
                  'flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  isCurrent && !isLocked && 'bg-bg-muted text-primary',
                  !isCurrent && !isLocked && 'text-text hover:bg-border',
                  isLocked && 'cursor-not-allowed text-text-muted opacity-60',
                )}
              >
                <span className="truncate pr-2 text-left font-semibold">
                  {year.title}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  {isFellow && totalItems > 0 && !isLocked && (
                    <span className="text-[11px] font-medium text-text-muted">
                      {completedItems}/{totalItems}
                    </span>
                  )}
                  {isLocked && (
                    <Lock className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  )}
                </span>
              </div>
            )

            if (isLocked) {
              return (
                <div
                  key={year.id}
                  className="mb-1"
                  aria-disabled="true"
                  title="Complete the previous phase to unlock"
                >
                  {row}
                </div>
              )
            }

            return (
              <Link
                key={year.id}
                href={`/phases/${year.id}`}
                onClick={onClose}
                aria-current={isCurrent ? 'page' : undefined}
                className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md mb-1"
              >
                {row}
              </Link>
            )
          })}

        {!loading && years.length === 0 && (
          <p className="px-2 py-1 text-xs text-text-muted">
            No phases published yet.
          </p>
        )}

        {!loading && isAdmin && (
          <div className="pt-2">
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
