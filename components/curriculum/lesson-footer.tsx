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
  // The link gate is enforced silently - the button is just disabled
  // until the fellow opens the resource, with no inline hint. The
  // reflection gate still surfaces a hint because the textarea sits
  // right above the footer and a nudge there is helpful.
  const blockMessage = needsReflection
    ? 'Submit your reflection above before you can mark this complete.'
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

  // Re-open a lesson the fellow has already finished. Server gates
  // only block incomplete -> complete, so flipping back to false is
  // always allowed and won't trip the link/reflection checks.
  function handleReopen() {
    setError(null)
    setOptimistic(false)
    startTransition(async () => {
      const res = await toggleContentCompletion(contentId, false)
      if (!res.ok) {
        setOptimistic(true)
        setError(res.message)
        return
      }
      router.refresh()
    })
  }

  function handleContinue() {
    if (nextHref) router.push(nextHref)
  }

  // "Completed" indicator. Doubles as the re-open affordance: hover
  // surfaces a "Mark as not completed" hint and clicking it flips
  // the lesson back to incomplete. Neutral tones only - no green.
  const completedBadge = (
    <button
      type="button"
      onClick={handleReopen}
      disabled={pending}
      title="Mark as not completed"
      aria-label="Mark as not completed"
      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      <span className="group-hover:hidden">Completed</span>
      <span className="hidden group-hover:inline">Mark as not completed</span>
    </button>
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
        ) : blocked ? (
          // Reflection (or link) gate is active. Don't even render
          // the Mark as completed button - completion isn't a
          // visual option yet. The hint above explains why.
          null
        ) : (
          // All gates cleared: single primary CTA.
          <Button
            type="button"
            onClick={handleMarkComplete}
            disabled={pending}
          >
            {pending ? 'Marking...' : 'Mark as completed'}
          </Button>
        )}
      </div>
    </div>
  )
}
