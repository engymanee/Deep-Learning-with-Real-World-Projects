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
  /**
   * When true, the manual "Mark complete" button is suppressed
   * - completion is driven by external state (e.g. a scheduled live
   * session that auto-completes once it has ended). The "Continue
   * to next item" / "Completed" affordances still render once the
   * lesson is complete; this only hides the manual incomplete CTA.
   */
  autoComplete?: boolean
  /**
   * Optional helper sentence shown next to the Mark-as-completed
   * CTA while the item is still incomplete. Used by live-session
   * items to reassure fellows that they should mark complete after
   * attending - even if they joined via Calendar instead of the
   * in-app link.
   */
  incompleteHint?: string | null
}

/**
 * Coursera-style two-state lesson CTA.
 *
 *  Not yet completed:  primary [ Mark complete ] button.
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
  autoComplete = false,
  incompleteHint,
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
      title="Mark incomplete"
      aria-label="Mark incomplete"
      className="group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <Check className="h-4 w-4" aria-hidden="true" />
      <span className="group-hover:hidden">Completed</span>
      <span className="hidden group-hover:inline">Mark incomplete</span>
    </button>
  )

  // Whether the page passed in a per-item helper hint to show
  // beside the Mark CTA. Only relevant while the lesson is still
  // incomplete and not gated by reflection/link clicks. When the
  // item auto-completes externally we also skip the hint - the
  // status block above the footer is the source of truth.
  const showIncompleteHint =
    !optimistic && !blocked && !autoComplete && !!incompleteHint

  return (
    <div className="flex flex-col gap-3 border-t border-border pt-6">
      {!optimistic && blocked && blockMessage && (
        <p className="text-sm text-muted-foreground" role="status">
          {blockMessage}
        </p>
      )}

      {showIncompleteHint && (
        <p className="text-sm text-muted-foreground" role="status">
          {incompleteHint}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        {optimistic ? (
          // Completed state. When there IS a next item we render
          // the primary nav CTA. When this is the final item in the
          // module we still want a way out, so a quiet "Back to
          // dashboard" link replaces the dead-end - alongside the
          // neutral Completed indicator either way.
          <>
            {nextHref ? (
              <Button
                type="button"
                onClick={handleContinue}
                size="lg"
                className="inline-flex items-center gap-2"
              >
                Go to next item
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2"
              >
                Back to dashboard
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Button>
            )}
            {completedBadge}
          </>
        ) : blocked ? (
          // Reflection (or link) gate is active. Don't even render
          // the Mark complete button - completion isn't a visual
          // option yet. The hint above explains why.
          null
        ) : autoComplete ? (
          // Completion is owned by an external mechanism (e.g. the
          // scheduled live-session block above auto-marks the item
          // complete once the session ends). No manual CTA needed.
          null
        ) : (
          // All gates cleared: single primary CTA.
          <Button
            type="button"
            onClick={handleMarkComplete}
            disabled={pending}
          >
            {pending ? 'Marking...' : 'Mark complete'}
          </Button>
        )}
      </div>
    </div>
  )
}
