'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { recordLinkClick } from '@/app/(curriculum)/phases/actions'

interface Props {
  contentId: string
  url: string
  /** Renders different copy ("Join now" vs "Open") for live sessions. */
  isLiveSession: boolean
  /** Whether the current user has already opened this link. */
  alreadyClicked: boolean
}

/**
 * "Open the resource" CTA. Opens the link in a new tab and, on the
 * first click, also records the open via the `recordLinkClick`
 * server action so the completion gate (link must be clicked before
 * the item can be marked complete) can clear.
 *
 * Optimistic - the green checkmark flips immediately and reverts on
 * server failure.
 */
export function LinkOpenButton({
  contentId,
  url,
  isLiveSession,
  alreadyClicked,
}: Props) {
  const router = useRouter()
  const [optimistic, setOptimistic] = useState(alreadyClicked)
  const [pending, startTransition] = useTransition()

  // Re-sync if the server state changes after a refresh.
  if (!pending && optimistic !== alreadyClicked && !optimistic) {
    setOptimistic(alreadyClicked)
  }

  function handleClick() {
    // Open first so the popup blocker treats this as a user gesture.
    window.open(url, '_blank', 'noopener,noreferrer')
    if (optimistic) return
    setOptimistic(true)
    startTransition(async () => {
      const res = await recordLinkClick(contentId)
      if (!res.ok) {
        setOptimistic(false)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={handleClick} className="inline-flex items-center gap-1.5">
        {isLiveSession ? 'Join now' : 'Open'}
        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      </Button>
      {optimistic && (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Opened
        </span>
      )}
    </div>
  )
}
