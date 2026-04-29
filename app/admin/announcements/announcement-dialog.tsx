'use client'

import { useMemo, useState, useTransition, useId } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Spinner } from '@/components/ui/spinner'
import { Search, X } from 'lucide-react'
import { createAnnouncement, updateAnnouncement } from './actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AudienceScope = 'global' | 'cohort' | 'school_team' | 'users'

export interface AnnouncementFormInitial {
  id: string | null
  audience_scope: AudienceScope
  cohort_codes: string[]
  school_team_ids: string[]
  user_ids: string[]
  title: string
  body: string
  pinned: boolean
  content_id: string | null
}

export interface SchoolTeamOption {
  id: string
  name: string
}

export interface FellowOption {
  id: string
  fullName: string
  email: string | null
  /** A/B/C cohort code surfaced as a small chip in search results so a
   *  curator picking individual fellows can disambiguate quickly. */
  cohort: string | null
}

export interface ContentOption {
  id: string
  /** Pretty path the option displays. Already includes phase + module. */
  label: string
  phaseId: string
  phaseTitle: string
}

interface Props {
  mode: 'create' | 'edit'
  initial?: Partial<AnnouncementFormInitial>
  schoolTeams: SchoolTeamOption[]
  fellows: FellowOption[]
  contentOptions: ContentOption[]
  /**
   * Optional inline trigger (button, menu item, etc.). When omitted,
   * the dialog is fully controlled by the parent via `open` /
   * `onOpenChange` and renders no trigger of its own. We use this
   * "no-trigger" mode from `<NewAnnouncementButton>`, so the button
   * stays decoupled from the dialog's internals.
   */
  trigger?: React.ReactNode
  /** Externally-controlled open state. Pair with `onOpenChange`. */
  open?: boolean
  onOpenChange?: (next: boolean) => void
}

const DEFAULTS: AnnouncementFormInitial = {
  id: null,
  audience_scope: 'global',
  cohort_codes: [],
  school_team_ids: [],
  user_ids: [],
  title: '',
  body: '',
  pinned: false,
  content_id: null,
}

const COHORT_CODES = ['A', 'B', 'C'] as const
const NO_CONTENT = '__none__'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AnnouncementDialog({
  mode,
  initial,
  schoolTeams,
  fellows,
  contentOptions,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: Props) {
  // Support both uncontrolled (legacy callsites that pass a `trigger`)
  // and fully-controlled (new `<NewAnnouncementButton>` pattern) modes.
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : uncontrolledOpen
  const setOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const merged: AnnouncementFormInitial = { ...DEFAULTS, ...initial }

  const [scope, setScope] = useState<AudienceScope>(merged.audience_scope)
  const [cohortCodes, setCohortCodes] = useState<string[]>(merged.cohort_codes)
  const [schoolTeamIds, setSchoolTeamIds] = useState<string[]>(
    merged.school_team_ids,
  )
  const [userIds, setUserIds] = useState<string[]>(merged.user_ids)
  const [contentId, setContentId] = useState<string | null>(merged.content_id)

  // Search inputs are local to each picker - they don't submit.
  const [schoolQuery, setSchoolQuery] = useState('')
  const [fellowQuery, setFellowQuery] = useState('')

  const titleId = useId()
  const bodyId = useId()
  const contentSelectId = useId()
  const schoolSearchId = useId()
  const fellowSearchId = useId()

  // Filtered + sorted lists for the two search-driven pickers.
  const filteredSchools = useMemo(() => {
    const q = schoolQuery.trim().toLowerCase()
    const list = q
      ? schoolTeams.filter((s) => s.name.toLowerCase().includes(q))
      : schoolTeams
    return [...list].sort((a, b) => a.name.localeCompare(b.name))
  }, [schoolTeams, schoolQuery])

  const filteredFellows = useMemo(() => {
    const q = fellowQuery.trim().toLowerCase()
    const list = q
      ? fellows.filter(
          (f) =>
            f.fullName.toLowerCase().includes(q) ||
            (f.email ?? '').toLowerCase().includes(q),
        )
      : fellows
    return [...list].sort((a, b) => a.fullName.localeCompare(b.fullName))
  }, [fellows, fellowQuery])

  // Quick lookup maps for chip rendering of currently-selected ids.
  const schoolById = useMemo(
    () => new Map(schoolTeams.map((s) => [s.id, s])),
    [schoolTeams],
  )
  const fellowById = useMemo(
    () => new Map(fellows.map((f) => [f.id, f])),
    [fellows],
  )

  const toggle = (
    list: string[],
    setList: (next: string[]) => void,
    value: string,
  ) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value])
  }

  const handleSubmit = (fd: FormData) => {
    setError(null)
    startTransition(async () => {
      try {
        if (mode === 'edit' && merged.id) {
          fd.set('id', merged.id)
          await updateAnnouncement(fd)
        } else {
          await createAnnouncement(fd)
        }
        setOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not save')
      }
    })
  }

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          // Re-seed local state from props each time the dialog opens.
          setScope(merged.audience_scope)
          setCohortCodes(merged.cohort_codes)
          setSchoolTeamIds(merged.school_team_ids)
          setUserIds(merged.user_ids)
          setContentId(merged.content_id)
          setSchoolQuery('')
          setFellowQuery('')
          setError(null)
        }
      }}
    >
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New announcement' : 'Edit announcement'}
          </DialogTitle>
          <DialogDescription>
            Announcements appear on learners&apos; dashboards. The audience
            decides who sees them.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-5">
          {/* ----------------------------------------------------------- */}
          {/* Audience scope                                              */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              name="audience_scope"
              value={scope}
              onValueChange={(v) => setScope(v as AudienceScope)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Everyone</SelectItem>
                <SelectItem value="cohort">Specific Cohort</SelectItem>
                <SelectItem
                  value="school_team"
                  disabled={schoolTeams.length === 0}
                >
                  Specific School Team
                </SelectItem>
                <SelectItem value="users" disabled={fellows.length === 0}>
                  Specific Fellow
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Specific Cohort: A / B / C multi-select                     */}
          {/* ----------------------------------------------------------- */}
          {scope === 'cohort' && (
            <fieldset className="space-y-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">
                Cohorts (pick one or more)
              </legend>
              <div className="flex flex-wrap gap-3">
                {COHORT_CODES.map((code) => {
                  const checked = cohortCodes.includes(code)
                  return (
                    <label
                      key={code}
                      className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm cursor-pointer hover:bg-bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() =>
                          toggle(cohortCodes, setCohortCodes, code)
                        }
                      />
                      Cohort {code}
                    </label>
                  )
                })}
              </div>
              {/* serialise selected codes as repeated form fields */}
              {cohortCodes.map((code) => (
                <input
                  key={code}
                  type="hidden"
                  name="cohort_codes"
                  value={code}
                />
              ))}
            </fieldset>
          )}

          {/* ----------------------------------------------------------- */}
          {/* Specific School Team: searchable multi-select               */}
          {/* ----------------------------------------------------------- */}
          {scope === 'school_team' && (
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">
                School teams (pick one or more)
              </legend>

              {/* Search */}
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden
                />
                <Input
                  id={schoolSearchId}
                  type="search"
                  value={schoolQuery}
                  onChange={(e) => setSchoolQuery(e.target.value)}
                  placeholder="Search school teams..."
                  className="pl-8"
                />
              </div>

              {/* Selected chips */}
              {schoolTeamIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {schoolTeamIds.map((id) => {
                    const s = schoolById.get(id)
                    if (!s) return null
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="pl-2 pr-1 gap-1"
                      >
                        {s.name}
                        <button
                          type="button"
                          aria-label={`Remove ${s.name}`}
                          className="ml-1 rounded-sm p-0.5 hover:bg-bg-muted"
                          onClick={() =>
                            toggle(schoolTeamIds, setSchoolTeamIds, id)
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              {/* Options list */}
              <ScrollArea className="h-48 rounded-md border border-border">
                <ul className="divide-y divide-border">
                  {filteredSchools.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-text-muted">
                      No matches
                    </li>
                  ) : (
                    filteredSchools.map((s) => {
                      const checked = schoolTeamIds.includes(s.id)
                      return (
                        <li key={s.id}>
                          <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-bg-muted">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggle(schoolTeamIds, setSchoolTeamIds, s.id)
                              }
                            />
                            <span className="truncate">{s.name}</span>
                          </label>
                        </li>
                      )
                    })
                  )}
                </ul>
              </ScrollArea>

              {schoolTeamIds.map((id) => (
                <input
                  key={id}
                  type="hidden"
                  name="school_team_ids"
                  value={id}
                />
              ))}
            </fieldset>
          )}

          {/* ----------------------------------------------------------- */}
          {/* Specific Fellow: search + multi-select                      */}
          {/* ----------------------------------------------------------- */}
          {scope === 'users' && (
            <fieldset className="space-y-3 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium">
                Fellows (filter by name and pick)
              </legend>

              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden
                />
                <Input
                  id={fellowSearchId}
                  type="search"
                  value={fellowQuery}
                  onChange={(e) => setFellowQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="pl-8"
                />
              </div>

              {userIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {userIds.map((id) => {
                    const f = fellowById.get(id)
                    if (!f) return null
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="pl-2 pr-1 gap-1"
                      >
                        {f.fullName}
                        <button
                          type="button"
                          aria-label={`Remove ${f.fullName}`}
                          className="ml-1 rounded-sm p-0.5 hover:bg-bg-muted"
                          onClick={() => toggle(userIds, setUserIds, id)}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}

              <ScrollArea className="h-56 rounded-md border border-border">
                <ul className="divide-y divide-border">
                  {filteredFellows.length === 0 ? (
                    <li className="px-3 py-6 text-center text-sm text-text-muted">
                      No matches
                    </li>
                  ) : (
                    filteredFellows.map((f) => {
                      const checked = userIds.includes(f.id)
                      return (
                        <li key={f.id}>
                          <label className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-bg-muted">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() =>
                                toggle(userIds, setUserIds, f.id)
                              }
                            />
                            <span className="flex-1 min-w-0">
                              <span className="block truncate font-medium">
                                {f.fullName}
                              </span>
                              {f.email && (
                                <span className="block truncate text-xs text-text-muted">
                                  {f.email}
                                </span>
                              )}
                            </span>
                            {f.cohort && (
                              <Badge variant="outline" className="shrink-0">
                                Cohort {f.cohort}
                              </Badge>
                            )}
                          </label>
                        </li>
                      )
                    })
                  )}
                </ul>
              </ScrollArea>

              {userIds.map((id) => (
                <input key={id} type="hidden" name="user_ids" value={id} />
              ))}
            </fieldset>
          )}

          {/* ----------------------------------------------------------- */}
          {/* Title / body                                                */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              name="title"
              defaultValue={merged.title}
              placeholder="e.g. New reading added to Lab 3"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={bodyId}>Message</Label>
            <Textarea
              id={bodyId}
              name="body"
              defaultValue={merged.body}
              placeholder="Share context, links, reminders..."
              rows={6}
              required
            />
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Optional curriculum pin                                     */}
          {/* ----------------------------------------------------------- */}
          <div className="space-y-2">
            <Label htmlFor={contentSelectId}>Pin to a curriculum item</Label>
            <Select
              value={contentId ?? NO_CONTENT}
              onValueChange={(v) => setContentId(v === NO_CONTENT ? null : v)}
              disabled={contentOptions.length === 0}
            >
              <SelectTrigger id={contentSelectId}>
                <SelectValue
                  placeholder={
                    contentOptions.length === 0
                      ? 'No curriculum items yet'
                      : 'No pinned content'
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value={NO_CONTENT}>No pinned content</SelectItem>
                {contentOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <input
              type="hidden"
              name="content_id"
              value={contentId ?? ''}
              readOnly
            />
            <p className="text-xs text-text-muted">
              Optional. Adds a one-tap link to the lab below the message on
              learners&apos; dashboards.
            </p>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Pin to top                                                  */}
          {/* ----------------------------------------------------------- */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pinned"
              name="pinned"
              defaultChecked={merged.pinned}
              className="h-4 w-4 rounded border-border"
            />
            <Label htmlFor="pinned" className="font-normal">
              Pin to the top of dashboards
            </Label>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Spinner className="mr-2 h-4 w-4" />}
              {mode === 'create' ? 'Publish' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
