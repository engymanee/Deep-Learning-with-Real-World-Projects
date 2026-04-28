'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleContentCompletion } from '@/app/(curriculum)/phases/actions'

interface Props {
  contentId: string
  isCompleted: boolean
  /** Server-rendered: link present but user hasn't opened it yet. */
  needsLinkClick: boolean
  /**
   * Server-rendered: reflection required AND not yet submitted at
   * the minimum word count. Mirrors the rule the server action
   * enforces on toggle.
   */
  needsReflection: boolean
  /** Next item href, or null when this is the last item. */
  nextHref: string | null
}

/**
 * Single combined CTA at the bottom of every lesson.
 *
 *  - Not yet completed + has next      -> "Mark as complete and continue"
 *    Toggles completion on the server, then routes to the next item.
 *  - Not yet completed + no next       -> "Mark as complete"
 *    Toggle only; nothing to navigate to.
 *  - Already completed + has next      -> "Continue"
 *    Pure navigation; no server call.
 *  - Already completed + no next       -> A small "Completed" badge.
 *    The fellow has finished the curriculum; nothing to continue to.
 *
 * The button is disabled (with an inline hint) until the per-item
 * gates pass: the fellow has opened the link (when there is one) and
 * submitted a reflection meeting the minimum word count (when
 * required).
 */
export function LessonFooter({
  contentId,
  isCompleted,
  needsLinkClick,
  needsReflection,
  nextHref,
}: Props) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState(isCompleted)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  // Sync server state when the page revalidates, but never clobber
  // an in-flight optimistic update.
  if (!pending && optimistic !== isCompleted) {
    setOptimistic(isCompleted)
  }

  const blocked = !optimistic && (needsLinkClick || needsReflection)
  const blockMessage = needsReflection
    ? 'Submit your reflection above before you can mark this complete.'
    : needsLinkClick
      ? 'Open the linked resource above before you can mark this complete.'
      : null

  function handleClick() {
    setError(null)

    // Already completed: this is a pure "Continue" navigation.
    if (optimistic) {
      if (nextHref) router.push(nextHref)
      return
    }

    // Not completed yet: toggle to complete, then continue if we
    // have somewhere to go.
    setOptimistic(true)
    startTransition(async () => {
      const res = await toggleContentCompletion(contentId, true)
      if (!res.ok) {
        setOptimistic(false)
        setError(res.message)
        return
      }
      if (nextHref) {
        router.push(nextHref)
      } else {
        router.refresh()
      }
    })
  }

  // Terminal state: already completed AND nothing to continue to.
  // Render a quiet, non-interactive pill in muted tones - no green
  // anywhere in the system.
  if (optimistic && !nextHref) {
    return (
      <div className="flex flex-col gap-3 border-t border-border pt-6">
        <div className="flex justify-end">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground">
            <Check className="h-4 w-4" aria-hidden="true" />
            Completed
          </span>
        </div>
      </div>
    )
  }

  const label = optimistic
    ? 'Mark as complete and continue'
    : nextHref
      ? 'Mark as complete and continue'
      : 'Mark as complete'

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      {blocked && blockMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {blockMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        {/* Soft (secondary) variant so the CTA reads as inviting in
            both states and stays clickable after the item is already
            complete - clicking it then just navigates to the next
            item without a redundant server toggle. */}
        <Button
          type="button"
          variant="secondary"
          onClick={handleClick}
          disabled={pending || blocked}
          className="inline-flex items-center gap-1.5"
        >
          {label}
          {nextHref && (
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
    </div>
  )
}
