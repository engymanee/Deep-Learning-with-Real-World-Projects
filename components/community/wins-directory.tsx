'use client'

import { useDeferredValue, useMemo, useState } from 'react'
import { Search, Star, Calendar, Award, Users } from 'lucide-react'
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
import { cn } from '@/lib/utils'
import type { CommunityPostListItem } from '@/lib/types/community'

interface Props {
  wins: CommunityPostListItem[]
  /**
   * Optional school/team filter. When provided, enables the team
   * filter dropdown in the UI and pre-filters wins by selected team.
   */
  currentTeam?: string
}

const ALL = '__all__'

/**
 * Visibility filter values for displaying wins by scope.
 */
type VisibilityFilter = typeof ALL | 'public' | 'cohort' | 'school_team'

/**
 * Wins Directory grid for the Community Wins page.
 *
 * Filters:
 *  - Free text search by title/body (deferred to keep typing smooth)
 *  - Framework/Protocol dropdown - filters by PWF Protocol used
 *  - Team/School dropdown - filters by school team
 *  - Star rating - shows wins by rating (1-5 stars, or all)
 *
 * Each win card displays:
 *  - Author avatar and name
 *  - Protocol badge (if tagged)
 *  - Star rating (1-5 visual stars)
 *  - Publication date
 *  - Preview of win description
 *  - Click -> opens full win detail view
 */
export function WinsDirectory({ wins, currentTeam }: Props) {
  const [query, setQuery] = useState('')
  const [framework, setFramework] = useState<string>(ALL)
  const [team, setTeam] = useState<string>(currentTeam ?? ALL)
  const [minRating, setMinRating] = useState<number>(0)
  const deferredQuery = useDeferredValue(query)

  // Extract unique frameworks/protocols from the wins data.
  const frameworkOptions = useMemo(() => {
    const set = new Set<string>()
    for (const win of wins) {
      if (win.framework_resource?.id && win.framework_resource?.title) {
        set.add(JSON.stringify({
          id: win.framework_resource.id,
          title: win.framework_resource.title,
        }))
      }
    }
    return [...set]
      .map((s) => JSON.parse(s))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [wins])

  // Extract unique teams/schools from the wins data.
  const teamOptions = useMemo(() => {
    const set = new Set<string>()
    for (const win of wins) {
      // If the win author has a school_names array or school_name, add it
      if (win.author?.school_names && win.author.school_names.length > 0) {
        for (const name of win.author.school_names) if (name) set.add(name)
      } else if (win.author?.school_name) {
        set.add(win.author.school_name)
      }
    }
    return [...set].sort()
  }, [wins])

  // Filter wins based on selected criteria.
  const filtered = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase()
    return wins.filter((win) => {
      // Framework filter
      if (framework !== ALL) {
        const fwId = JSON.parse(framework).id
        if (win.framework_resource?.id !== fwId) return false
      }

      // Team filter - check author's school team membership
      if (team !== ALL) {
        const authorTeams = win.author?.school_names ?? []
        if (authorTeams.length === 0 && win.author?.school_name) {
          if (win.author.school_name !== team) return false
        } else if (!authorTeams.includes(team)) {
          return false
        }
      }

      // Minimum rating filter
      if (minRating > 0 && (win.star_rating ?? 0) < minRating) return false

      // Free text search on title and body
      if (q) {
        const titleMatch = win.title.toLowerCase().includes(q)
        const bodyMatch = win.excerpt.toLowerCase().includes(q)
        if (!titleMatch && !bodyMatch) return false
      }

      return true
    })
  }, [wins, deferredQuery, framework, team, minRating])

  return (
    <div className="space-y-6">
      {/* Filters Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search wins by title or description..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1"
          />
          {query && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setQuery('')}
              className="h-10 w-10 p-0"
            >
              ×
            </Button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Protocol
            </label>
            <Select value={framework} onValueChange={setFramework}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All Protocols</SelectItem>
                {frameworkOptions.map((fw) => (
                  <SelectItem key={fw.id} value={JSON.stringify(fw)}>
                    {fw.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {teamOptions.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Team
              </label>
              <Select value={team} onValueChange={setTeam}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All Teams</SelectItem>
                  {teamOptions.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Minimum Rating
            </label>
            <Select
              value={minRating.toString()}
              onValueChange={(v) => setMinRating(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any Rating</SelectItem>
                <SelectItem value="1">1+ Stars</SelectItem>
                <SelectItem value="2">2+ Stars</SelectItem>
                <SelectItem value="3">3+ Stars</SelectItem>
                <SelectItem value="4">4+ Stars</SelectItem>
                <SelectItem value="5">5 Stars</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery('')
                setFramework(ALL)
                setTeam(currentTeam ?? ALL)
                setMinRating(0)
              }}
              className="w-full"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filtered.length === 0
            ? 'No wins match your filters'
            : `${filtered.length} ${filtered.length === 1 ? 'win' : 'wins'}`}
        </p>
      </div>

      {/* Wins Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="font-medium text-muted-foreground">
            No wins found
          </h3>
          <p className="text-sm text-muted-foreground/80">
            Try adjusting your filters to find more wins
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((win) => (
            <div
              key={win.id}
              className={cn(
                'group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-all hover:shadow-md hover:border-primary/50'
              )}
            >
              {/* Header: Author + Date */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="relative h-8 w-8 flex-shrink-0 rounded-full overflow-hidden bg-muted">
                    {win.author?.avatar_url ? (
                      <img
                        src={win.author.avatar_url}
                        alt={win.author.full_name || 'Author'}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/40 text-xs font-semibold">
                        {win.author?.full_name
                          ?.split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()
                          .slice(0, 2) ?? 'A'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {win.author?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {win.published_at
                        ? new Date(win.published_at).toLocaleDateString()
                        : 'Recently'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Protocol Badge */}
              {win.framework_resource && (
                <Badge variant="secondary" className="w-fit text-xs">
                  {win.framework_resource.title}
                </Badge>
              )}

              {/* Title */}
              <div className="flex-1">
                <h3 className="font-semibold line-clamp-2 text-base group-hover:text-primary transition-colors">
                  {win.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {win.excerpt}
                </p>
              </div>

              {/* Star Rating */}
              {win.star_rating && (
                <div className="flex items-center gap-1 pt-2 border-t">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={cn(
                          'h-4 w-4',
                          star <= win.star_rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30',
                        )}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-medium text-muted-foreground ml-1">
                    {win.star_rating}/5
                  </span>
                </div>
              )}

              {/* Team Badge */}
              {win.author?.school_name && (
                <div className="flex items-center gap-2 pt-2">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {win.author.school_name}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
