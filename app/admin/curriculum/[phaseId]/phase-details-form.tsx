'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CohortAccessField } from '@/components/admin/cohort-access-field'
import { updatePhase, deletePhase } from '../actions'

interface Props {
  phase: {
    id: string
    title: string
    description: string
    cohorts: string[]
  }
}

export function PhaseDetailsForm({ phase }: Props) {
  const router = useRouter()
  const titleId = useId()
  const descId = useId()
  const [message, setMessage] = useState<
    { kind: 'ok' | 'error'; text: string } | null
  >(null)
  const [pending, startTransition] = useTransition()
  const [deleting, startDelete] = useTransition()

  function onSave(formData: FormData) {
    setMessage(null)
    formData.set('id', phase.id)
    startTransition(async () => {
      const res = await updatePhase(formData)
      setMessage({ kind: res.ok ? 'ok' : 'error', text: res.message })
      if (res.ok) router.refresh()
    })
  }

  function onDelete() {
    const fd = new FormData()
    fd.set('id', phase.id)
    startDelete(async () => {
      const res = await deletePhase(fd)
      if (res.ok) {
        router.replace('/admin/curriculum')
      } else {
        setMessage({ kind: 'error', text: res.message })
      }
    })
  }

  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <header className="mb-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Phase details
        </p>
        <h2 className="mt-1 font-serif text-xl text-foreground">
          Edit phase
        </h2>
      </header>

      <form action={onSave} className="flex flex-col gap-5">
        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={titleId}>Title</Label>
            <Input
              id={titleId}
              name="title"
              required
              defaultValue={phase.title}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={descId}>Description</Label>
            <Textarea
              id={descId}
              name="description"
              rows={3}
              defaultValue={phase.description}
              placeholder="A short summary fellows see on their dashboard."
            />
          </div>
        </div>

        <CohortAccessField
          defaultValue={phase.cohorts}
          idPrefix={`phase-cohort-${phase.id}`}
          description="Assign this phase to one or more cohorts. Only fellows in the assigned cohort(s) can see it. Leaving all unchecked hides the phase from every fellow."
        />

        {message && (
          <p
            className={`text-sm ${
              message.kind === 'error' ? 'text-destructive' : 'text-muted-foreground'
            }`}
            role={message.kind === 'error' ? 'alert' : 'status'}
          >
            {message.text}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete phase
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this phase?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes the phase and every content item
                  inside it. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  disabled={deleting}
                  className="bg-destructive text-white hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting...' : 'Delete phase'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button type="submit" disabled={pending}>
            {pending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </form>
    </section>
  )
}
