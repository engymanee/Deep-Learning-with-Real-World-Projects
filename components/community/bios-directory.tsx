'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { MemberCard } from '@/components/profile/member-card'
import { ProfileModal } from '@/components/profile/profile-view'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DirectoryProfile } from '@/lib/types/profile'

interface Props {
  profiles: DirectoryProfile[]
  /**
   * Whether to expose the cohort filter and the cohort chip on the
   * cards / modal. Cohort labels are program-internal staging data,
   * so the server only sets this true for admins.
   */
  showCohort?: boolean
}

const ALL = '__all__'

/**
 * People-type filter values. "Faculty" is the user-facing label for
 * program staff and covers both the `facilitator` and `admin` roles
 * in the database, so fellows can find program staff bios without
 * needing to know our internal role taxonomy.
 */
type PeopleType = typeof ALL | 'fellow' | 'faculty'

const FACULTY_ROLES = new Set(['facilitator', 'admin'])

/**
 * Fellow Bios grid for the Community page.
 *
 * Filters:
 *  - Free text search by name (deferred to keep typing smooth on
 *    larger lists; we re-render the filtered grid when the search
 *    settles).
 *  - Cohort dropdown - only the cohorts present in the data.
 *  - Team / school dropdown - same rule.
 *
 * Click a card -> opens the shared ProfileModal. The detailed
 * card variant is used here so each tile teases the bio - the
 * modal is reserved for the full view.
 */
export function BiosDirectory({ profiles, showCohort = false }: Props) {
  const [query, setQuery] = useState('')
  const [cohort, setCohort] = useState<string>(ALL)
  const [team, setTeam] = useState<string>(ALL)
  const [peopleType, setPeopleType] = useState<PeopleType>(ALL)
  const [selected, setSelected] = useState<DirectoryProfile | null>(null)
  const deferredQuery = useDeferredValue(query)

  // Surface the people-type tabs only when the directory contains
  // both fellows and faculty - no need to show a single-option
  // toggle on a homogeneous list.
  const hasFellows = useMemo(
    () => profiles.some((p) => p.role === 'fellow'),
    [profiles],
  )
  const hasFaculty = useMemo(
    () => profiles.some((p) => p.role && FACULTY_ROLES.has(p.role)),
    [profiles],
  )
  const showPeopleType = hasFellows && hasFaculty

  // Cohort filter is admin-only (matches the cohort chip rule).
  const cohortOptions = useMemo(() => {
    if (!showCohort) return []
    const set = new Set<string>()
    for (const p of profiles) if (p.cohort) set.add(p.cohort)
    return [...set].sort()
  }, [profiles, showCohort])

  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) if (p.school_name) set.add(p.school_name)
    return [...set].sort()
  }, [profiles])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return profiles.filter((p) => {
      // People-type: "fellow" matches role === 'fellow', "faculty"
      // matches the FACULTY_ROLES set (facilitator + admin).
      if (peopleType === 'fellow' && p.role !== 'fellow') return false
      if (
        peopleType === 'faculty' &&
        !(p.role && FACULTY_ROLES.has(p.role))
      ) {
        return false
      }
      if (cohort !== ALL && p.cohort !== cohort) return false
      if (team !== ALL && p.school_name !== team) return false
      if (q.length > 0) {
        const haystack = [p.full_name, p.email, p.title]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [profiles, deferredQuery, cohort, team, peopleType])

  const showReset =
    cohort !== ALL ||
    team !== ALL ||
    peopleType !== ALL ||
    query.trim().length > 0

  function reset() {
    setQuery('')
    setCohort(ALL)
    setTeam(ALL)
    setPeopleType(ALL)
  }

  const peopleTabs: Array<{
    value: PeopleType
    label: string
    count: number
  }> = [
    { value: ALL, label: 'All', count: profiles.length },
    {
      value: 'fellow',
      label: 'Fellows',
      count: profiles.filter((p) => p.role === 'fellow').length,
    },
    {
      value: 'faculty',
      label: 'Faculty',
      count: profiles.filter((p) => p.role && FACULTY_ROLES.has(p.role))
        .length,
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* People-type tabs. Rendered only when the list contains both
          fellows and faculty so we don't show a one-option toggle. */}
      {showPeopleType && (
        <div
          role="tablist"
          aria-label="Filter by role"
          className="inline-flex w-fit rounded-md border border-border bg-card p-1"
        >
          {peopleTabs.map((tab) => {
            const active = peopleType === tab.value
            return (
              <button
                key={tab.value}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setPeopleType(tab.value)}
                className={
                  active
                    ? 'inline-flex items-center gap-2 rounded-sm bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground'
                    : 'inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground'
                }
              >
                <span>{tab.label}</span>
                <span
                  className={
                    active
                      ? 'rounded bg-primary-foreground/20 px-1.5 text-xs tabular-nums'
                      : 'rounded bg-muted px-1.5 text-xs tabular-nums text-muted-foreground'
                  }
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, email, or role..."
            aria-label="Search Fellow Bios"
            className="pl-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {cohortOptions.length > 0 && (
            <Select value={cohort} onValueChange={setCohort}>
              <SelectTrigger className="h-9 min-w-[10rem]" aria-label="Filter by cohort">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All cohorts</SelectItem>
                {cohortOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    Cohort {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {teamOptions.length > 0 && (
            <Select value={team} onValueChange={setTeam}>
              <SelectTrigger className="h-9 min-w-[12rem]" aria-label="Filter by team">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All teams</SelectItem>
                {teamOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {showReset && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Reset
            </Button>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {profiles.length}
        {filtered.length !== profiles.length && (
          <Badge variant="outline" className="ml-2 text-[10px]">
            Filtered
          </Badge>
        )}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-md border border-dashed border-border bg-card px-4 py-12 text-center text-sm text-muted-foreground">
          No one matches your search and filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <MemberCard
              key={p.id}
              profile={p}
              variant="detailed"
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
