'use client'

import { useState, useTransition } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Pencil, Plus, Trash2 } from 'lucide-react'
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { LabRow, type CurriculumItem } from './lab-row'
import { createLab, deleteYear, updateYear, type ActionResult } from './actions'
import { CohortAccessField, CohortBadge } from '@/components/admin/cohort-access-field'

export type Phase = {
  id: string
  title: string
  description: string | null
  cohorts: string[]
}

/**
 * One Phase card. The item list itself is both a SortableContext (so
 * children can be reordered) and a droppable (so empty phases still
 * accept drops). The `useDroppable` id is the phase id which lets the
 * board's onDragOver detect cross-phase drops.
 */
export function PhaseColumn({ phase, items }: { phase: Phase; items: CurriculumItem[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: phase.id })

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Phase
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl text-foreground">{phase.title}</h2>
            <CohortBadge cohorts={phase.cohorts} />
          </div>
          {phase.description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {phase.description}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <EditPhaseDialog phase={phase} />
          <DeletePhaseDialog phase={phase} itemCount={items.length} />
          <AddItemDialog phaseId={phase.id} />
        </div>
      </header>

      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul
          ref={setNodeRef}
          className={`flex min-h-[52px] flex-col divide-y divide-border rounded-md border transition-colors ${
            isOver ? 'border-primary bg-primary/5' : 'border-border'
          }`}
        >
          {items.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">
              {isOver ? 'Drop here' : 'No items yet. Add one, or drag an item in from another phase.'}
            </li>
          ) : (
            items.map((item) => <LabRow key={item.id} item={item} />)
          )}
        </ul>
      </SortableContext>
    </section>
  )
}

// ----------------------------------------------------------------------------

function EditPhaseDialog({ phase }: { phase: Phase }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('id', phase.id)
    startTransition(async () => {
      const r: ActionResult = await updateYear(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 800)
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
          <Pencil className="h-4 w-4" />
          Edit phase
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit phase</DialogTitle>
          <DialogDescription>
            Rename this phase or update its summary. Fellows see both in the sidebar and
            on the program overview.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`phase-title-${phase.id}`}>Title</FieldLabel>
              <Input
                id={`phase-title-${phase.id}`}
                name="title"
                defaultValue={phase.title}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`phase-desc-${phase.id}`}>Description</FieldLabel>
              <Textarea
                id={`phase-desc-${phase.id}`}
                name="description"
                defaultValue={phase.description ?? ''}
                rows={3}
              />
              <FieldDescription>
                Shown on the curriculum landing page and program overview.
              </FieldDescription>
            </Field>
            <CohortAccessField
              defaultValue={phase.cohorts}
              idPrefix={`phase-cohort-${phase.id}`}
              description="Assign this phase to one or more cohorts. Only fellows in the assigned cohort(s) can see it. Leaving all unchecked hides the phase from every fellow."
            />
            {msg && (
              <p
                role="status"
                className={
                  msg.type === 'ok' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'
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

// ----------------------------------------------------------------------------

/**
 * Destructive confirmation for removing a phase. We require the admin to
 * type the phase title to confirm when the phase still has items in it,
 * so deleting a populated phase is never a single mis-click. If the
 * phase is empty we still surface the confirm dialog, but don't gate on
 * the text match.
 */
function DeletePhaseDialog({ phase, itemCount }: { phase: Phase; itemCount: number }) {
  const [open, setOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  const needsTypedConfirm = itemCount > 0
  const canSubmit = !needsTypedConfirm || confirmText.trim() === phase.title

  function onConfirm() {
    if (!canSubmit) return
    setErr(null)
    const fd = new FormData()
    fd.set('id', phase.id)
    startTransition(async () => {
      const r = await deleteYear(fd)
      if (r.ok) {
        setOpen(false)
      } else {
        setErr(r.message)
      }
    })
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setConfirmText('')
          setErr(null)
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Delete phase
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{phase.title}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            {itemCount === 0 ? (
              <>This phase has no items. Deleting it cannot be undone.</>
            ) : (
              <>
                This will permanently delete the phase along with its{' '}
                <strong className="text-foreground">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </strong>{' '}
                and every content block inside them. Fellows&apos; progress records for
                those items will also be removed. This cannot be undone.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {needsTypedConfirm && (
          <Field>
            <FieldLabel htmlFor={`confirm-delete-${phase.id}`}>
              Type <span className="font-mono">{phase.title}</span> to confirm
            </FieldLabel>
            <Input
              id={`confirm-delete-${phase.id}`}
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoComplete="off"
              placeholder={phase.title}
            />
          </Field>
        )}

        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              onConfirm()
            }}
            disabled={!canSubmit || pending}
            className="bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20"
          >
            {pending && <Spinner className="h-4 w-4" />}
            Delete phase
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

// ----------------------------------------------------------------------------

function AddItemDialog({ phaseId }: { phaseId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('year_id', phaseId)
    startTransition(async () => {
      const r: ActionResult = await createLab(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 800)
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
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add an item</DialogTitle>
          <DialogDescription>
            Items appear in the sidebar and dashboard. They hold the before / during /
            after content flow you&apos;ll build next.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`new-item-id-${phaseId}`}>Item id (slug)</FieldLabel>
              <Input
                id={`new-item-id-${phaseId}`}
                name="id"
                required
                placeholder="e.g. lab-6 or module-2-5"
                pattern="[a-z0-9\-]+"
              />
              <FieldDescription>
                Lowercase letters, numbers, and dashes only. Used in the URL, so pick
                something short and stable.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`new-item-title-${phaseId}`}>Title</FieldLabel>
              <Input
                id={`new-item-title-${phaseId}`}
                name="title"
                required
                placeholder="e.g. Lab 6: Holding Space"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`new-item-desc-${phaseId}`}>
                Description (optional)
              </FieldLabel>
              <Textarea
                id={`new-item-desc-${phaseId}`}
                name="description"
                rows={3}
                placeholder="A short summary fellows will see above the item content."
              />
            </Field>
            <CohortAccessField
              idPrefix={`new-item-cohort-${phaseId}`}
              description="Assign this item to one or more cohorts. Only fellows in the assigned cohort(s) can see it."
            />
            {msg && (
              <p
                role="status"
                className={
                  msg.type === 'ok' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'
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
              Create item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
