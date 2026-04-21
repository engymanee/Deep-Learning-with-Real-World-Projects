'use client'

import { useState, useTransition, useId } from 'react'
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
import { Spinner } from '@/components/ui/spinner'
import { createAnnouncement, updateAnnouncement } from './actions'

export interface AnnouncementFormInitial {
  id: string | null
  audience_scope: 'global' | 'year' | 'cohort'
  year_id: string | null
  cohort_id: string | null
  title: string
  body: string
  pinned: boolean
}

export interface YearOption {
  id: string
  title: string
}

export interface CohortOption {
  id: string
  name: string
}

interface Props {
  mode: 'create' | 'edit'
  initial?: Partial<AnnouncementFormInitial>
  years: YearOption[]
  cohorts: CohortOption[]
  trigger: React.ReactNode
}

const DEFAULTS: AnnouncementFormInitial = {
  id: null,
  audience_scope: 'global',
  year_id: null,
  cohort_id: null,
  title: '',
  body: '',
  pinned: false,
}

export function AnnouncementDialog({
  mode,
  initial,
  years,
  cohorts,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const merged: AnnouncementFormInitial = { ...DEFAULTS, ...initial }
  const [scope, setScope] = useState<AnnouncementFormInitial['audience_scope']>(
    merged.audience_scope,
  )
  const [yearId, setYearId] = useState<string | null>(merged.year_id)
  const [cohortId, setCohortId] = useState<string | null>(merged.cohort_id)

  const titleId = useId()
  const bodyId = useId()

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

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          // Reset local state from props each time the dialog re-opens.
          setScope(merged.audience_scope)
          setYearId(merged.year_id)
          setCohortId(merged.cohort_id)
          setError(null)
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'New announcement' : 'Edit announcement'}
          </DialogTitle>
          <DialogDescription>
            Announcements appear on learners&apos; dashboards. Scope decides who
            sees them.
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {/* Scope picker */}
          <div className="space-y-2">
            <Label>Audience</Label>
            <Select
              name="audience_scope"
              value={scope}
              onValueChange={(v) =>
                setScope(v as AnnouncementFormInitial['audience_scope'])
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="global">Everyone</SelectItem>
                <SelectItem value="year" disabled={years.length === 0}>
                  Specific year
                </SelectItem>
                <SelectItem value="cohort" disabled={cohorts.length === 0}>
                  Specific cohort
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Year picker (only when scope=year) */}
          {scope === 'year' && (
            <div className="space-y-2">
              <Label>Year</Label>
              <Select
                name="year_id"
                value={yearId ?? ''}
                onValueChange={(v) => setYearId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Cohort picker (only when scope=cohort) */}
          {scope === 'cohort' && (
            <div className="space-y-2">
              <Label>Cohort</Label>
              <Select
                name="cohort_id"
                value={cohortId ?? ''}
                onValueChange={(v) => setCohortId(v || null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pick a cohort" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
