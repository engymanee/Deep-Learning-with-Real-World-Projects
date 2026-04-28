'use client'

import { useState, useTransition } from 'react'
import { Trash2 } from 'lucide-react'
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
import { Spinner } from '@/components/ui/spinner'
import { deleteContentItem } from './actions'

interface ContentItemDeleteProps {
  id: string
  yearId: string
  title: string
}

/**
 * Confirm-and-delete dialog for a single content item. Kept as a tiny
 * standalone component so the row can render the trigger inline next
 * to its edit affordance.
 */
export function ContentItemDelete({ id, yearId, title }: ContentItemDeleteProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function onConfirm() {
    setErr(null)
    const fd = new FormData()
    fd.set('id', id)
    fd.set('year_id', yearId)
    startTransition(async () => {
      const r = await deleteContentItem(fd)
      if (r.ok) {
        setOpen(false)
      } else {
        setErr(r.message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setErr(null)
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive"
          aria-label={`Delete ${title}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Delete</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete &ldquo;{title}&rdquo;?</DialogTitle>
          <DialogDescription>This cannot be undone.</DialogDescription>
        </DialogHeader>
        {err && <p className="text-sm text-destructive">{err}</p>}
        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Spinner className="h-4 w-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
