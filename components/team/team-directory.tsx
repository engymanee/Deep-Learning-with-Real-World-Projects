'use client'

import { useMemo, useState } from 'react'
import { MemberCard } from '@/components/profile/member-card'
import { ProfileModal } from '@/components/profile/profile-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DirectoryProfile } from '@/lib/types/profile'
import { cn } from '@/lib/utils'

interface Props {
  members: DirectoryProfile[]
  /**
   * Whether to expose the cohort filter pills and the cohort chip
   * on cards / modal. Admin-only; fellows don't see staging labels.
   */
  showCohort?: boolean
}

/**
 * Team grid + cohort filter + profile modal. Server passes the
 * already-filtered list of schoolmates; this island handles client-
 * side interactivity (filter pills, modal selection) without an
 * extra round-trip. The modal trigger lives on the cards via the
 * `onSelect` callback, so parent state stays a single nullable
 * profile id (rather than a Set + open boolean).
 *
 * Cohort filter only renders when the team has mixed cohorts, per
 * spec - it would be noise on a single-cohort team.
 */
export function TeamDirectory({ members, showCohort = false }: Props) {
  const [selected, setSelected] = useState<DirectoryProfile | null>(null)
  const [cohortFilter, setCohortFilter] = useState<string | null>(null)

  // Distinct cohorts present in this team. Sorted alphabetically so
  // the filter pills render A, B, C in a stable order regardless of
  // the underlying member sort. Empty for non-admins so the filter
  // chrome below collapses entirely.
  const distinctCohorts = useMemo(() => {
    if (!showCohort) return []
    const set = new Set<string>()
    for (const m of members) if (m.cohort) set.add(m.cohort)
    return [...set].sort()
  }, [members, showCohort])

  const showCohortFilter = distinctCohorts.length > 1
  const filtered = useMemo(() => {
    if (!cohortFilter) return members
    return members.filter((m) => m.cohort === cohortFilter)
  }, [members, cohortFilter])

  return (
    <div className="flex flex-col gap-4">
      {showCohortFilter && (
        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Filter team by cohort"
        >
          <span className="text-xs font-medium tracking-wide text-muted-foreground">
            Cohort
          </span>
          <FilterPill
            active={cohortFilter === null}
            onClick={() => setCohortFilter(null)}
          >
            All
            <Badge variant="outline" className="ml-1 text-[10px]">
              {members.length}
            </Badge>
          </FilterPill>
          {distinctCohorts.map((c) => {
            const count = members.filter((m) => m.cohort === c).length
            return (
              <FilterPill
                key={c}
                active={cohortFilter === c}
                onClick={() => setCohortFilter(c)}
              >
                Cohort {c}
                <Badge variant="outline" className="ml-1 text-[10px]">
                  {count}
                </Badge>
              </FilterPill>
            )
          })}
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
          No teammates match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MemberCard
              key={m.id}
              profile={m}
              variant="compact"
              showCohort={showCohort}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      <ProfileModal
        profile={selected}
        onOpenChange={(open) => !open && setSelected(null)}
        showCohort={showCohort}
      />
    </div>
  )
}

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={cn('h-8 rounded-full px-3 text-xs', active && 'shadow-sm')}
      aria-pressed={active}
    >
      {children}
    </Button>
  )
}
