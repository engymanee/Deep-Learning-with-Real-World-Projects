'use client'

import { useState, useTransition } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { deleteComment } from '@/app/community/reflections/actions'

/**
 * Tiny wrapper around the existing `deleteComment` server action.
 * Lives next to the moderation page because it's the only place
 * that calls `deleteComment` against arbitrary comment ids; on the
 * normal post / reflection pages the comment-thread component owns
 * its own delete button.
 *
 * On success we hide the row locally (returns null) so admins get
 * immediate visual feedback without a route refresh - the next
 * navigation pulls fresh data.
 */
export function CommentDeleteButton({ commentId }: { commentId: string }) {
  const [pending, start] = useTransition()
  const [hidden, setHidden] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (hidden) {
    return (
      <span className="text-xs italic text-muted-foreground">deleted</span>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1 text-destructive hover:text-destructive"
        onClick={() => {
          setError(null)
          start(async () => {
            const result = await deleteComment({ commentId })
            if (!result.ok) {
              setError(result.message ?? 'Could not delete')
              return
            }
            setHidden(true)
          })
        }}
        disabled={pending}
      >
        {pending ? (
          <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
        ) : (
          <Trash2 className="h-3 w-3" aria-hidden="true" />
        )}
        Delete
      </Button>
      {error && (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
