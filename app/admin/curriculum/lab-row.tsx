'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Pencil,
  Trash2,
  ArrowUpRight,
  MoreHorizontal,
  GripVertical,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { deleteLab, updateLab, type ActionResult } from './actions'

export type CurriculumItem = {
  id: string
  year_id: string
  title: string
  description: string | null
  block_count: number
}

/**
 * Sortable row that represents one item (a `lab` in the DB) inside a
 * phase. The drag handle is the GripVertical button - clicking anywhere
 * else in the row still works for Edit content / dropdown actions.
 */
export function LabRow({ item }: { item: CurriculumItem }) {
  const [editOpen, setEditOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  function handleDelete() {
    if (
      !confirm(
        `Delete "${item.title}"? This removes the item and all of its content blocks. This cannot be undone.`,
      )
    )
      return
    const fd = new FormData()
    fd.set('id', item.id)
    setToast(null)
    startTransition(async () => {
      const r = await deleteLab(fd)
      setToast(r.message)
      setTimeout(() => setToast(null), 2500)
    })
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 bg-background px-4 py-3 ${
        isDragging ? 'relative z-10 opacity-50 shadow-md' : ''
      }`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${item.title}`}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.block_count} {item.block_count === 1 ? 'block' : 'blocks'}
          {item.description ? ` - ${item.description}` : ''}
        </p>
        {toast && <p className="mt-0.5 text-xs text-muted-foreground">{toast}</p>}
      </div>

      <div className="flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href={`/admin/curriculum/labs/${item.id}`}>
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
                Delete item
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <EditLabDialog item={item} open={editOpen} onOpenChange={setEditOpen} />
    </li>
  )
}

function EditLabDialog({
  item,
  open,
  onOpenChange,
}: {
  item: CurriculumItem
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('id', item.id)
    startTransition(async () => {
      const r: ActionResult = await updateLab(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          onOpenChange(false)
          setMsg(null)
        }, 900)
      } else {
        setMsg({ type: 'err', text: r.message })
      }
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
          <DialogTitle>Edit item details</DialogTitle>
          <DialogDescription>
            Change the title or summary shown to fellows. To edit the item&apos;s content
            flow (before / during / after), use &ldquo;Edit content&rdquo;.
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel>Item id</FieldLabel>
              <Input value={item.id} disabled />
            </Field>
            <Field>
              <FieldLabel htmlFor={`lab-title-${item.id}`}>Title</FieldLabel>
              <Input
                id={`lab-title-${item.id}`}
                name="title"
                defaultValue={item.title}
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`lab-desc-${item.id}`}>Description</FieldLabel>
              <Textarea
                id={`lab-desc-${item.id}`}
                name="description"
                defaultValue={item.description ?? ''}
                rows={3}
              />
            </Field>
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

/**
 * Presentational-only version used inside <DragOverlay>. It has the
 * same look as a real row but isn't hooked to dnd-kit so it can float
 * with the pointer during a drag.
 */
export function LabRowOverlay({ item }: { item: CurriculumItem }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background px-4 py-3 shadow-lg">
      <GripVertical className="h-4 w-4 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
        <p className="truncate text-xs text-muted-foreground">
          {item.block_count} {item.block_count === 1 ? 'block' : 'blocks'}
        </p>
      </div>
    </div>
  )
}
