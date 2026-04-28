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
 * Coursera-style two-state lesson CTA.
 *
 *  Not yet completed:  primary [ Mark as completed ] button.
 *                      Disabled with an inline hint until the link
 *                      has been opened (when present) and a
 *                      reflection meeting the minimum word count has
 *                      been submitted (when required).
 *
 *  Already completed:  primary [ Go to next item ] button next to a
 *                      neutral "Completed" indicator. (No green - we
 *                      keep the success tone in muted/foreground per
 *                      project rule.) The button is just navigation;
 *                      it never re-toggles the server state.
 *
 *  Final lesson, completed: only the "Completed" indicator - there
 *                      is nowhere to continue to.
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

  function handleMarkComplete() {
    setError(null)
    setOptimistic(true)
    startTransition(async () => {
      const res = await toggleContentCompletion(contentId, true)
      if (!res.ok) {
        setOptimistic(false)
        setError(res.message)
        return
      }
      router.refresh()
    })
  }

  function handleContinue() {
    if (nextHref) router.push(nextHref)
  }

  // Reusable "Completed" indicator - shown alongside the Go-to-next
  // button, or alone on the final lesson. Neutral tones only.
  const completedBadge = (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
      aria-label="Completed"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      Completed
    </span>
  )

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      {!optimistic && blocked && blockMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {blockMessage}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {optimistic ? (
          // Completed state: navigation button + neutral indicator.
          // On the last lesson there's no nextHref so we drop the
          // button and show only the indicator.
          <>
            {nextHref && (
              <Button
                type="button"
                onClick={handleContinue}
                className="inline-flex items-center gap-1.5"
              >
                Go to next item
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            )}
            {completedBadge}
          </>
        ) : (
          // Not yet complete: single primary CTA.
          <Button
            type="button"
            onClick={handleMarkComplete}
            disabled={pending || blocked}
          >
            {pending ? 'Marking...' : 'Mark as completed'}
          </Button>
        )}
      </div>
    </div>
  )
}
