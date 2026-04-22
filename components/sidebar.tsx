'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
  Lock,
  Check,
  Pencil,
  Plus,
  ShieldCheck,
  X,
  Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { stripYearPrefix } from '@/lib/year-labels'
import { createYear, updateYear } from '@/app/admin/curriculum/actions'

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

  // Admin-only inline edit state.
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState('')
  const [pending, startTransition] = useTransition()

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

      // Compute unlock set.
      // Admins and facilitators: every year is unlocked.
      // Fellows: the first year is always unlocked; any later year is unlocked
      // only once the preceding year has been marked complete (or the fellow
      // has an explicit non-locked row for that year).
      const unlocked = new Set<string>()
      if (currentRole === 'admin' || currentRole === 'facilitator') {
        allYears.forEach((y) => unlocked.add(y.id))
      } else {
        const progressByYear = new Map(yearProgress.map((p) => [p.year_id, p.status]))
        let previousComplete = true // first year is always reachable
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

  const beginRename = (year: YearRow) => {
    setRenamingId(year.id)
    setRenameDraft(stripYearPrefix(year.title) || year.title)
  }

  const cancelRename = () => {
    setRenamingId(null)
    setRenameDraft('')
  }

  const submitRename = (year: YearRow) => {
    const title = renameDraft.trim()
    if (!title) return
    const fd = new FormData()
    fd.set('id', year.id)
    fd.set('title', title)
    startTransition(async () => {
      const res = await updateYear(fd)
      if (res.ok) {
        setYears((prev) => prev.map((y) => (y.id === year.id ? { ...y, title } : y)))
        setRenamingId(null)
        setRenameDraft('')
      } else {
        console.error('[v0] Rename year failed:', res.message)
      }
    })
  }

  const submitCreate = () => {
    const title = createDraft.trim()
    if (!title) return
    const fd = new FormData()
    fd.set('title', title)
    startTransition(async () => {
      const res = await createYear(fd)
      if (res.ok) {
        // Refresh the list from the DB so the new row's id is accurate.
        const supabase = createClient()
        const { data } = await supabase
          .from('years')
          .select('id, title, order_index')
          .order('order_index', { ascending: true })
        setYears(data ?? [])
        setUnlockedYears((prev) => {
          const next = new Set(prev)
          ;(data ?? []).forEach((y) => next.add(y.id))
          return next
        })
        setCreating(false)
        setCreateDraft('')
      } else {
        console.error('[v0] Create year failed:', res.message)
      }
    })
  }

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
            const isLocked = !isUnlocked // fellows-only; admins always unlocked
            const displayTitle = stripYearPrefix(year.title) || year.title
            const isRenaming = renamingId === year.id

            return (
              <div key={year.id} className="mb-3">
                {isRenaming ? (
                  <div className="flex items-center gap-1 rounded-md bg-bg-muted px-2 py-1">
                    <input
                      autoFocus
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') submitRename(year)
                        if (e.key === 'Escape') cancelRename()
                      }}
                      className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm text-text outline-none focus:border-primary"
                      aria-label="New label name"
                    />
                    <button
                      type="button"
                      onClick={() => submitRename(year)}
                      disabled={pending || !renameDraft.trim()}
                      className="rounded p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                      aria-label="Save"
                    >
                      {pending ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <Check className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={cancelRename}
                      disabled={pending}
                      className="rounded p-1 text-text-muted hover:bg-border"
                      aria-label="Cancel"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-stretch gap-1">
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
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => beginRename(year)}
                        className="rounded-md px-2 text-text-muted opacity-0 transition-opacity hover:bg-border hover:text-text focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Rename ${displayTitle}`}
                        title="Rename label"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                )}

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
            {creating ? (
              <div className="flex items-center gap-1 rounded-md bg-bg-muted px-2 py-1">
                <input
                  autoFocus
                  value={createDraft}
                  onChange={(e) => setCreateDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitCreate()
                    if (e.key === 'Escape') {
                      setCreating(false)
                      setCreateDraft('')
                    }
                  }}
                  placeholder="New label name"
                  className="flex-1 rounded border border-border bg-white px-2 py-1 text-sm text-text outline-none focus:border-primary"
                  aria-label="New label name"
                />
                <button
                  type="button"
                  onClick={submitCreate}
                  disabled={pending || !createDraft.trim()}
                  className="rounded p-1 text-primary hover:bg-primary/10 disabled:opacity-50"
                  aria-label="Create label"
                >
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setCreateDraft('')
                  }}
                  disabled={pending}
                  className="rounded p-1 text-text-muted hover:bg-border"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 text-sm text-text-muted transition-colors hover:border-accent hover:bg-accent/5 hover:text-accent"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                New label
              </button>
            )}
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
