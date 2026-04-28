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
}

const ALL = '__all__'

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
export function BiosDirectory({ profiles }: Props) {
  const [query, setQuery] = useState('')
  const [cohort, setCohort] = useState<string>(ALL)
  const [team, setTeam] = useState<string>(ALL)
  const [selected, setSelected] = useState<DirectoryProfile | null>(null)
  const deferredQuery = useDeferredValue(query)

  const cohortOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) if (p.cohort) set.add(p.cohort)
    return [...set].sort()
  }, [profiles])

  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    for (const p of profiles) if (p.school_name) set.add(p.school_name)
    return [...set].sort()
  }, [profiles])

  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return profiles.filter((p) => {
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
  }, [profiles, deferredQuery, cohort, team])

  const showReset =
    cohort !== ALL || team !== ALL || query.trim().length > 0

  function reset() {
    setQuery('')
    setCohort(ALL)
    setTeam(ALL)
  }

  return (
    <div className="flex flex-col gap-4">
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
          No fellows match your search and filters.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <MemberCard
              key={p.id}
              profile={p}
              variant="detailed"
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      <ProfileModal
        profile={selected}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </div>
  )
}
