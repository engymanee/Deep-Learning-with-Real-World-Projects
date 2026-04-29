'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { createCommunityPost } from '@/app/community/actions'
import type { CommunitySection } from '@/lib/community/sections'

interface Props {
  section: CommunitySection
  /**
   * Whether the current user is allowed to post in this section.
   * Computed server-side from `staffOnly` + role and passed in so
   * fellows simply don't see the trigger for staff-only sections.
   */
  canPost: boolean
}

/**
 * Composer button + modal for a Community section.
 *
 * Stays client-side because the dialog needs local state and we want
 * optimistic feedback on submit. Submission goes through the
 * `createCommunityPost` server action which validates kind + role
 * and inserts a published row.
 */
export function PostComposer({ section, canPost }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!canPost || !section.writeKind) return null

  function reset() {
    setTitle('')
    setBody('')
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const t = title.trim()
    const b = body.trim()
    if (!t) return setError('Add a title.')
    if (!b) return setError('Add some content.')

    startTransition(async () => {
      const result = await createCommunityPost({
        kind: section.writeKind!,
        title: t,
        body: b,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      reset()
      setOpen(false)
      // Refresh server data so the new post shows in the feed.
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          {section.composerCta}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{section.composerCta}</DialogTitle>
          <DialogDescription>{section.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="composer-title">Title</Label>
            <Input
              id="composer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={section.composerTitlePlaceholder}
              maxLength={200}
              autoFocus
              disabled={pending}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="composer-body">Content</Label>
            <Textarea
              id="composer-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={section.composerBodyPlaceholder}
              rows={7}
              maxLength={10_000}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              {body.length}/10,000 characters
            </p>
          </div>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-3.5 w-3.5" />}
              {section.composerCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
