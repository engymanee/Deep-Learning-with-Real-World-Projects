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

interface Props {
  /**
   * Only the primitive section fields the composer actually needs.
   * Receiving the full CommunitySection object would force the
   * server-rendered SectionHeader to serialize `section.icon` (a
   * Lucide React component) into this client boundary, which React
   * rejects with "Functions cannot be passed directly to Client
   * Components". Strings + the writable kind are all this dialog
   * uses, so we accept exactly that.
   */
  /** The kind to write into community_posts.kind on submit. */
  writeKind: string
  /** One-liner shown as the dialog description. */
  description: string
  /** Title-input placeholder. */
  titlePlaceholder: string
  /** Body-textarea placeholder. */
  bodyPlaceholder: string
  /** Label on both the trigger button and the submit button. */
  composerCta: string
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
export function PostComposer({
  writeKind,
  description,
  titlePlaceholder,
  bodyPlaceholder,
  composerCta,
  canPost,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!canPost) return null

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
        kind: writeKind,
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
          {composerCta}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{composerCta}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="composer-title">Title</Label>
            <Input
              id="composer-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={titlePlaceholder}
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
              placeholder={bodyPlaceholder}
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
              {composerCta}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
