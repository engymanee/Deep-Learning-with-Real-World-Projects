'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toggleContentCompletion } from '@/app/(curriculum)/phases/actions'

interface Props {
  contentId: string
  isCompleted: boolean
  /** Server-rendered: link present but user hasn't opened it yet. */
  needsLinkClick: boolean
  /** Server-rendered: reflection required but not yet submitted. */
  needsReflection: boolean
  /** Next item href, or null when this is the last item. */
  nextHref: string | null
}

/**
 * Sticky-ish footer that pairs a "Mark as complete" toggle with a
 * "Continue" CTA pointing at the next visible content item.
 *
 * The mark-complete button is gated by the same prereqs the server
 * action enforces (link click, reflection submit), and shows an
 * inline hint when blocked so the fellow knows what's missing.
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

  // Sync server state on refresh. Only flip back from optimistic
  // when there isn't a pending request in flight.
  if (!pending && optimistic !== isCompleted) {
    setOptimistic(isCompleted)
  }

  // The gate only blocks completing - unchecking is always allowed.
  const blocked = !optimistic && (needsLinkClick || needsReflection)
  const blockMessage = needsReflection
    ? 'Submit your reflection above before marking complete.'
    : needsLinkClick
      ? 'Open the linked resource above before marking complete.'
      : null

  function handleToggle() {
    setError(null)
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      const res = await toggleContentCompletion(contentId, next)
      if (!res.ok) {
        setOptimistic(!next)
        setError(res.message)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      {/* Inline gate hint. Stays present so the fellow always knows
          what's blocking them, not just on a click. */}
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

      {/* Buttons sit next to each other, end-aligned, so the
          "Mark as complete -> Continue" pairing reads as a single
          CTA cluster at the bottom of the lesson. */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          type="button"
          variant={optimistic ? 'outline' : 'default'}
          onClick={handleToggle}
          disabled={pending || blocked}
          aria-pressed={optimistic}
          className="inline-flex items-center gap-1.5"
        >
          {optimistic ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              Completed
            </>
          ) : (
            'Mark as complete'
          )}
        </Button>

        {/* Continue is always available when there's a next item -
            fellows can revisit a lesson without being forced to
            mark complete. Greys out on the last item. */}
        <Button
          asChild={!!nextHref}
          variant={optimistic ? 'default' : 'outline'}
          disabled={!nextHref}
          className={cn(
            'inline-flex items-center gap-1.5',
            !nextHref && 'pointer-events-none opacity-60',
          )}
        >
          {nextHref ? (
            <a href={nextHref}>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
          ) : (
            <span>
              Continue
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </Button>
      </div>
    </div>
  )
}
