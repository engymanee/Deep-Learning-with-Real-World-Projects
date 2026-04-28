'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CohortAccessField } from '@/components/admin/cohort-access-field'
import { createPhase } from './actions'

export function CreatePhaseDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const titleId = useId()
  const descId = useId()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const res = await createPhase(formData)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          New phase
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form action={onSubmit} className="space-y-5">
          <DialogHeader>
            <DialogTitle>New phase</DialogTitle>
            <DialogDescription>
              Phases are the top-level groupings of the curriculum. After
              creating, click into the phase to start adding content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              name="title"
              required
              autoFocus
              placeholder="e.g. Year 1 - Foundations"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={descId}>Short description (optional)</Label>
            <Textarea
              id={descId}
              name="description"
              rows={3}
              placeholder="A one or two sentence summary that fellows will see on the dashboard."
            />
          </div>

          <CohortAccessField
            idPrefix="new-phase-cohort"
            description="Assign this phase to one or more cohorts. Only fellows in the assigned cohort(s) can see it."
          />

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating...' : 'Create phase'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
