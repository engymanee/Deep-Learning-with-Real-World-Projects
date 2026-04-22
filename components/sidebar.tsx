'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { stripYearPrefix } from '@/lib/year-labels'

interface YearRow {
  id: string
  title: string
  order_index: number
}

interface LabRow {
  id: string
  title: string
  year_id: string
  order_index: number
}

interface LabProgressRow {
  lab_id: string
  completed_at: string | null
}

interface YearProgressRow {
  year_id: string
  status: 'locked' | 'in_progress' | 'complete'
}

type LabStatus = 'complete' | 'in_progress' | 'not_started'
type Role = 'fellow' | 'facilitator' | 'admin' | null

function CompletionDot({ status }: { status: LabStatus }) {
  switch (status) {
    case 'complete':
      return (
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground"
          aria-label="Completed"
        >
          <Check className="h-2.5 w-2.5" aria-hidden="true" />
        </span>
      )
    case 'in_progress':
      return (
        <span
          className="h-2 w-2 rounded-full bg-gradient-to-r from-primary to-transparent"
          aria-label="In progress"
        />
      )
    case 'not_started':
    default:
      return (
        <span
          className="h-2 w-2 rounded-full border border-primary"
          aria-label="Not started"
        />
      )
  }
}

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  currentYearId?: string
  currentLabId?: string
}

/**
 * Dashboard / lab curriculum sidebar.
 *
 * Display only - no admin editing lives here. Fellows see a lock icon on
 * years that haven't been unlocked yet; admins and facilitators see every
 * year as open. All curriculum editing (rename, create new labels, reorder,
 * etc.) happens on /admin/curriculum.
 */
export function Sidebar({
  isOpen = true,
  onClose,
  currentYearId,
  currentLabId,
}: SidebarProps) {
  const [years, setYears] = useState<YearRow[]>([])
  const [labs, setLabs] = useState<LabRow[]>([])
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [unlockedYears, setUnlockedYears] = useState<Set<string>>(new Set())
  const [role, setRole] = useState<Role>(null)
  const [expandedYear, setExpandedYear] = useState<string | null>(currentYearId ?? null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (currentYearId) setExpandedYear(currentYearId)
  }, [currentYearId])

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
          .select('id, title, order_index')
          .order('order_index', { ascending: true }),
        supabase
          .from('labs')
          .select('id, title, year_id, order_index')
          .order('order_index', { ascending: true }),
      ])

      let currentRole: Role = null
      let yearProgress: YearProgressRow[] = []
      let labProgress: LabProgressRow[] = []

      if (user) {
        const [{ data: profileRow }, { data: yp }, { data: lp }] = await Promise.all([
          supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle<{ role: Role }>(),
          supabase
            .from('user_year_progress')
            .select('year_id, status')
            .eq('profile_id', user.id),
          supabase
            .from('user_lab_progress')
            .select('lab_id, completed_at')
            .eq('profile_id', user.id),
        ])
        currentRole = profileRow?.role ?? null
        yearProgress = (yp ?? []) as YearProgressRow[]
        labProgress = (lp ?? []) as LabProgressRow[]
      }

      if (cancelled) return

      const allYears = yearsData ?? []
      setYears(allYears)
      setLabs(labsData ?? [])
      setRole(currentRole)
      setCompleted(
        new Set(
          labProgress.filter((p) => p.completed_at != null).map((p) => p.lab_id),
        ),
      )

      // Admins / facilitators get everything unlocked. Fellows unlock the
      // first year automatically, and each subsequent year only once the
      // preceding one is marked complete (or they already have a
      // non-locked row for it).
      const unlocked = new Set<string>()
      if (currentRole === 'admin' || currentRole === 'facilitator') {
        allYears.forEach((y) => unlocked.add(y.id))
      } else {
        const progressByYear = new Map(yearProgress.map((p) => [p.year_id, p.status]))
        let previousComplete = true
        for (const y of allYears) {
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

  const toggleYear = (yearId: string) => {
    setExpandedYear(expandedYear === yearId ? null : yearId)
  }

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
            <div className="h-8 animate-pulse rounded bg-bg-muted" />
            <div className="h-8 animate-pulse rounded bg-bg-muted" />
            <div className="h-8 animate-pulse rounded bg-bg-muted" />
          </div>
        )}

        {!loading &&
          years.map((year) => {
            const yearLabs = labs.filter((l) => l.year_id === year.id)
            const isExpanded = expandedYear === year.id
            const isUnlocked = unlockedYears.has(year.id)
            const isLocked = !isUnlocked
            const displayTitle = stripYearPrefix(year.title) || year.title

            return (
              <div key={year.id} className="mb-3">
                <button
                  type="button"
                  onClick={() => !isLocked && toggleYear(year.id)}
                  disabled={isLocked}
                  aria-expanded={isExpanded}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-semibold transition-colors',
                    isExpanded && !isLocked
                      ? 'bg-bg-muted text-primary'
                      : 'text-text hover:bg-border',
                    isLocked && 'cursor-not-allowed opacity-60',
                  )}
                >
                  <span className="truncate pr-2 text-left">{displayTitle}</span>
                  {isLocked ? (
                    <Lock className="h-4 w-4 text-text-muted" aria-hidden="true" />
                  ) : isExpanded ? (
                    <ChevronDown className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>

                {isExpanded && !isLocked && (
                  <div className="ml-2 mt-1 space-y-0.5 border-l border-border pl-2">
                    {yearLabs.map((lab) => {
                      const isCurrent = currentLabId === lab.id
                      const status: LabStatus = completed.has(lab.id)
                        ? 'complete'
                        : isCurrent
                        ? 'in_progress'
                        : 'not_started'

                      return (
                        <Link
                          key={lab.id}
                          href={`/labs/${lab.id}`}
                          onClick={onClose}
                          aria-current={isCurrent ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors',
                            isCurrent
                              ? 'border-l-2 border-primary bg-white font-medium text-text'
                              : 'text-text hover:bg-border/30',
                          )}
                        >
                          <CompletionDot status={status} />
                          <span className="truncate leading-relaxed">{lab.title}</span>
                        </Link>
                      )
                    })}
                    {yearLabs.length === 0 && (
                      <p className="px-2 py-1 text-xs text-text-muted">
                        No labs published yet.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}

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
