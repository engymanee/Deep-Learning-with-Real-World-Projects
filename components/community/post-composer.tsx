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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import { createCommunityPost } from '@/app/community/actions'
import { ASK_CATEGORIES } from '@/lib/community/ask-categories'

/** Sentinel for "no framework selected" - SelectItem can't have empty value. */
const NO_FRAMEWORK = '__none__'

/** Sentinel for "no category selected" in the ask composer. */
const NO_CATEGORY = '__none__'

interface FrameworkOption {
  id: string
  title: string
}

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
  /**
   * PWF Protocol options for the framework dropdown. When provided,
   * the composer renders a select for the fellow to attribute their
   * win to a specific protocol. Empty array hides the dropdown.
   */
  frameworks?: FrameworkOption[]
  /**
   * When true, the composer requires + surfaces an Ask category
   * picker. Used by the Asks composer to enforce categorisation.
   */
  requireAskCategory?: boolean
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
  frameworks,
  requireAskCategory = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  // The framework picker is optional even when offered. The "none"
  // sentinel keeps the select component happy (it doesn't allow
  // empty-string values) without forcing the user to pick.
  const [framework, setFramework] = useState<string>(NO_FRAMEWORK)
  const [askCategory, setAskCategory] = useState<string>(NO_CATEGORY)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!canPost) return null

  const offerFrameworks = (frameworks?.length ?? 0) > 0

  function reset() {
    setTitle('')
    setBody('')
    setFramework(NO_FRAMEWORK)
    setAskCategory(NO_CATEGORY)
    setError(null)
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const t = title.trim()
    const b = body.trim()
    if (!t) return setError('Add a title.')
    if (!b) return setError('Add some content.')
    if (requireAskCategory && askCategory === NO_CATEGORY) {
      return setError('Pick a category for your question.')
    }

    startTransition(async () => {
      const result = await createCommunityPost({
        kind: writeKind,
        title: t,
        body: b,
        // Strip the sentinel before sending; the server action treats
        // null / undefined as "no framework".
        frameworkResourceId:
          framework === NO_FRAMEWORK ? null : framework,
        askCategory:
          askCategory === NO_CATEGORY ? null : askCategory,
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

          {requireAskCategory && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="composer-ask-category">Category</Label>
              <Select
                value={askCategory}
                onValueChange={setAskCategory}
                disabled={pending}
              >
                <SelectTrigger id="composer-ask-category">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {ASK_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Categories help peers and program staff route your
                question to the right people.
              </p>
            </div>
          )}

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
              {body.length.toLocaleString()}/10,000 characters
              {/* Tip about hashtags - they're rendered live on the
                  post detail page and the search bar treats them like
                  any other word. */}
              {' · '}
              Tip: use #hashtags to make your post easier to find.
            </p>
          </div>

          {offerFrameworks && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="composer-framework">
                PWF Protocol used (optional)
              </Label>
              <Select
                value={framework}
                onValueChange={setFramework}
                disabled={pending}
              >
                <SelectTrigger id="composer-framework">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_FRAMEWORK}>None</SelectItem>
                  {frameworks!.map((fw) => (
                    <SelectItem key={fw.id} value={fw.id}>
                      {fw.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Tag the protocol you used so other fellows can learn
                from your example.
              </p>
            </div>
          )}

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
