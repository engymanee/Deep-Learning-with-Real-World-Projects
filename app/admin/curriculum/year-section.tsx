'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  Pencil,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  ArrowUpRight,
  MoreHorizontal,
} from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  createLab,
  deleteLab,
  moveLab,
  updateLab,
  updateYear,
  type ActionResult,
} from './actions'

type Year = { id: string; title: string; description: string | null }
type Lab = {
  id: string
  year_id: string
  title: string
  description: string | null
  order_index: number
  block_count: number
}

type Props = {
  year: Year
  labs: Lab[]
  isFirst: boolean
  isLast: boolean
}

export function YearSection({ year, labs }: Props) {
  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Year
          </p>
          <h2 className="font-serif text-xl text-foreground">{year.title}</h2>
          {year.description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {year.description}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <EditYearDialog year={year} />
          <AddLabDialog yearId={year.id} />
        </div>
      </header>

      {labs.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No labs yet. Click &ldquo;Add lab&rdquo; to create the first one.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
          {labs.map((lab, i) => (
            <LabRow
              key={lab.id}
              lab={lab}
              isFirst={i === 0}
              isLast={i === labs.length - 1}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

// ----------------------------------------------------------------------------

function EditYearDialog({ year }: { year: Year }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('id', year.id)
    startTransition(async () => {
      const r = await updateYear(fd)
      handleResult(r, setMsg, () => setOpen(false))
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="h-4 w-4" />
          Edit year
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit year</DialogTitle>
          <DialogDescription>
            The three years are fixed - you can change their title and description.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`year-title-${year.id}`}>Title</FieldLabel>
              <Input
                id={`year-title-${year.id}`}
                name="title"
                defaultValue={year.title}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`year-desc-${year.id}`}>Description</FieldLabel>
              <Textarea
                id={`year-desc-${year.id}`}
                name="description"
                defaultValue={year.description ?? ''}
                rows={3}
              />
              <FieldDescription>
                Shown on the curriculum landing page and program overview.
              </FieldDescription>
            </Field>
            <StatusMessage msg={msg} />
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

function AddLabDialog({ yearId }: { yearId: string }) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('year_id', yearId)
    startTransition(async () => {
      const r = await createLab(fd)
      handleResult(r, setMsg, () => setOpen(false))
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
          Add lab
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a lab</DialogTitle>
          <DialogDescription>
            Labs appear in the sidebar and dashboard. They hold the content blocks you&apos;ll add next.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`new-lab-id-${yearId}`}>Lab id (slug)</FieldLabel>
              <Input
                id={`new-lab-id-${yearId}`}
                name="id"
                required
                placeholder="e.g. lab-6 or module-2-5"
                pattern="[a-z0-9\-]+"
              />
              <FieldDescription>
                Lowercase letters, numbers, and dashes only. Used in the URL, so pick something short and stable.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`new-lab-title-${yearId}`}>Title</FieldLabel>
              <Input
                id={`new-lab-title-${yearId}`}
                name="title"
                required
                placeholder="e.g. Lab 6: Holding Space"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`new-lab-desc-${yearId}`}>Description (optional)</FieldLabel>
              <Textarea
                id={`new-lab-desc-${yearId}`}
                name="description"
                rows={3}
                placeholder="A short summary fellows will see above the lab content."
              />
            </Field>
            <StatusMessage msg={msg} />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              Create lab
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ----------------------------------------------------------------------------

function LabRow({ lab, isFirst, isLast }: { lab: Lab; isFirst: boolean; isLast: boolean }) {
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)

  function run(action: () => Promise<ActionResult>) {
    setToast(null)
    startTransition(async () => {
      const r = await action()
      setToast(r.message)
      setTimeout(() => setToast(null), 2500)
    })
  }

  function handleMove(direction: 'up' | 'down') {
    const fd = new FormData()
    fd.set('id', lab.id)
    fd.set('direction', direction)
    run(() => moveLab(fd))
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${lab.title}"? This removes the lab and all of its content blocks. This cannot be undone.`,
      )
    )
      return
    const fd = new FormData()
    fd.set('id', lab.id)
    run(() => deleteLab(fd))
  }

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => handleMove('up')}
          disabled={pending || isFirst}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={() => handleMove('down')}
          disabled={pending || isLast}
          className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent"
          aria-label="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{lab.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {lab.block_count} {lab.block_count === 1 ? 'block' : 'blocks'}
          {lab.description ? ` - ${lab.description}` : ''}
        </p>
        {toast && <p className="mt-0.5 text-xs text-muted-foreground">{toast}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/curriculum/labs/${lab.id}`}>
            Edit content
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </Button>

        {pending ? (
          <Spinner className="h-4 w-4 text-muted-foreground" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">More</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit details
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={handleDelete}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete lab
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <EditLabDialog lab={lab} open={editOpen} onOpenChange={setEditOpen} />
    </li>
  )
}

// ----------------------------------------------------------------------------

function EditLabDialog({
  lab,
  open,
  onOpenChange,
}: {
  lab: Lab
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('id', lab.id)
    startTransition(async () => {
      const r = await updateLab(fd)
      handleResult(r, setMsg, () => onOpenChange(false))
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setMsg(null)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit lab details</DialogTitle>
          <DialogDescription>
            Change the title or summary shown to fellows. To edit the lab&apos;s content blocks, use &ldquo;Edit content&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Lab id</FieldLabel>
              <Input value={lab.id} disabled />
              <FieldDescription>Lab ids are permanent so URLs don&apos;t break.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor={`lab-title-${lab.id}`}>Title</FieldLabel>
              <Input
                id={`lab-title-${lab.id}`}
                name="title"
                defaultValue={lab.title}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`lab-desc-${lab.id}`}>Description</FieldLabel>
              <Textarea
                id={`lab-desc-${lab.id}`}
                name="description"
                defaultValue={lab.description ?? ''}
                rows={3}
              />
            </Field>
            <StatusMessage msg={msg} />
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
// Shared UI helpers
// ----------------------------------------------------------------------------

function StatusMessage({
  msg,
}: {
  msg: { type: 'ok' | 'err'; text: string } | null
}) {
  if (!msg) return null
  return (
    <p
      role="status"
      className={
        msg.type === 'ok' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'
      }
    >
      {msg.text}
    </p>
  )
}

function handleResult(
  r: ActionResult,
  setMsg: (m: { type: 'ok' | 'err'; text: string } | null) => void,
  onSuccess: () => void,
) {
  if (r.ok) {
    setMsg({ type: 'ok', text: r.message })
    setTimeout(() => {
      onSuccess()
      setMsg(null)
    }, 900)
  } else {
    setMsg({ type: 'err', text: r.message })
  }
}
