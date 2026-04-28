'use client'

import { useState, useTransition } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
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
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { CohortAccessField } from '@/components/admin/cohort-access-field'
import { updateYear, deleteYear } from './actions'

interface PhaseActionsProps {
  id: string
  title: string
  description: string | null
  cohorts: string[]
  itemCount: number
}

/**
 * Edit + delete affordances for a single phase header. Pure-client
 * dialogs; both actions delegate to the corresponding server action and
 * roll up the response into a tiny inline status message.
 */
export function PhaseActions({
  id,
  title,
  description,
  cohorts,
  itemCount,
}: PhaseActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <EditPhaseDialog
        id={id}
        title={title}
        description={description}
        cohorts={cohorts}
      />
      <DeletePhaseDialog id={id} title={title} itemCount={itemCount} />
    </div>
  )
}

function EditPhaseDialog({
  id,
  title,
  description,
  cohorts,
}: {
  id: string
  title: string
  description: string | null
  cohorts: string[]
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('id', id)
    startTransition(async () => {
      const r = await updateYear(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 600)
      } else {
        setMsg({ type: 'err', text: r.message })
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setMsg(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit phase</DialogTitle>
          <DialogDescription>
            Update the phase name, description, or cohort access.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`edit-phase-title-${id}`}>Title</FieldLabel>
              <Input
                id={`edit-phase-title-${id}`}
                name="title"
                required
                defaultValue={title}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`edit-phase-desc-${id}`}>
                Description (optional)
              </FieldLabel>
              <Textarea
                id={`edit-phase-desc-${id}`}
                name="description"
                rows={3}
                defaultValue={description ?? ''}
              />
              <FieldDescription>
                Shown to fellows on the phase landing page.
              </FieldDescription>
            </Field>
            <CohortAccessField
              defaultValue={cohorts}
              idPrefix={`edit-phase-cohort-${id}`}
              description="Assign this phase to one or more cohorts. Only fellows in the assigned cohort(s) can see it. Items inside this phase inherit this access by default."
            />
            {msg && (
              <p
                role="status"
                className={
                  msg.type === 'ok'
                    ? 'text-sm text-emerald-600'
                    : 'text-sm text-destructive'
                }
              >
                {msg.text}
              </p>
            )}
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function DeletePhaseDialog({
  id,
  title,
  itemCount,
}: {
  id: string
  title: string
  itemCount: number
}) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit() {
    setMsg(null)
    const fd = new FormData()
    fd.set('id', id)
    startTransition(async () => {
      const r = await deleteYear(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 400)
      } else {
        setMsg({ type: 'err', text: r.message })
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setMsg(null)
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{title}&rdquo;?</DialogTitle>
          <DialogDescription>
            {itemCount > 0
              ? `This will also delete the ${itemCount} content ${
                  itemCount === 1 ? 'item' : 'items'
                } inside it. This cannot be undone.`
              : 'This phase has no content. This cannot be undone.'}
          </DialogDescription>
        </DialogHeader>
        {msg && (
          <p
            role="status"
            className={
              msg.type === 'ok'
                ? 'text-sm text-emerald-600'
                : 'text-sm text-destructive'
            }
          >
            {msg.text}
          </p>
        )}
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onSubmit}
          >
            {pending && <Spinner className="h-4 w-4" />}
            Delete phase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
