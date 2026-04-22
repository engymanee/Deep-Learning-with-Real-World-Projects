'use client'

import { useState, useTransition } from 'react'
import { Plus } from 'lucide-react'
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
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { createYear } from './actions'

/**
 * Admin-only action to create a new curriculum label (a row in `years`).
 * Lives on /admin/curriculum - fellows and facilitators never see this
 * button, and the server action itself re-checks `requireAdmin()` as a
 * safety net.
 */
export function AddYearDialog() {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function onSubmit(fd: FormData) {
    setMsg(null)
    startTransition(async () => {
      const r = await createYear(fd)
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
          Add label
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add a curriculum label</DialogTitle>
          <DialogDescription>
            Labels appear in the sidebar and on the dashboard. Each label groups a set of
            labs (like &ldquo;Deep Learning&rdquo; or &ldquo;Wisdom Coaching&rdquo;).
          </DialogDescription>
        </DialogHeader>
        <form action={onSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="new-year-title">Title</FieldLabel>
              <Input
                id="new-year-title"
                name="title"
                required
                placeholder="e.g. Community of Practice"
              />
              <FieldDescription>
                Shown verbatim in the sidebar. A URL-safe id is generated from the title
                automatically.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="new-year-desc">Description (optional)</FieldLabel>
              <Textarea
                id="new-year-desc"
                name="description"
                rows={3}
                placeholder="A short summary fellows will see on the curriculum landing page."
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              Create label
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
