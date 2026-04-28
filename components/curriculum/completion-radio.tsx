'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleContentCompletion } from '@/app/(curriculum)/phases/actions'

interface Props {
  contentId: string
  /** Server-rendered initial state. */
  isCompleted: boolean
  /** Item title - used for the screen-reader label. */
  itemTitle: string
}

/**
 * Radio-style completion toggle that mirrors the visual in the design
 * brief: an outline circle when incomplete, a filled circle with a
 * check when complete. Optimistically updates local state, then
 * confirms via the server action and refreshes the route.
 *
 * Wrapped in a stop-propagation handler so it doesn't trigger the
 * parent <Link> navigation when the user clicks the radio itself.
 */
export function CompletionRadio({ contentId, isCompleted, itemTitle }: Props) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState(isCompleted)
  const [pending, startTransition] = useTransition()

  // If the server-rendered prop changes (e.g. after a router.refresh),
  // sync local state. This is fine because optimistic updates only
  // ever flip the value once.
  if (!pending && optimistic !== isCompleted) {
    setOptimistic(isCompleted)
  }

  // When the server rejects (e.g. the fellow hasn't opened the link
  // or submitted a required reflection), we revert the optimistic
  // tick AND surface the message via the button's `title` so they
  // get a hover hint without us having to plumb a toast through the
  // tree. The full UX lives on the item page itself.
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  function onClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setErrorMessage(null)
    const next = !optimistic
    setOptimistic(next)
    startTransition(async () => {
      const res = await toggleContentCompletion(contentId, next)
      if (!res.ok) {
        setOptimistic(!next)
        setErrorMessage(res.message)
        return
      }
      router.refresh()
    })
  }

  const label = optimistic
    ? `Mark "${itemTitle}" as not complete`
    : `Mark "${itemTitle}" as complete`

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={optimistic}
      aria-label={label}
      title={errorMessage ?? label}
      onClick={onClick}
      disabled={pending}
      className={cn(
        'grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors',
        optimistic
          ? 'border-foreground bg-foreground text-background'
          : 'border-muted-foreground/40 bg-transparent hover:border-foreground/70',
        pending && 'opacity-60',
      )}
    >
      {optimistic ? (
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
      ) : (
        <span className="sr-only">incomplete</span>
      )}
    </button>
  )
}
