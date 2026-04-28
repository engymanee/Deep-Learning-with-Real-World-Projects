'use client'

import { useState, useTransition } from 'react'
import { Check, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  CONTENT_RESOURCE_TYPE_LABELS,
  type ContentResourceType,
} from '@/lib/content-types'
import { toggleItemCompletion } from '@/app/phases/[phaseId]/actions'

export interface ContentItemView {
  id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  resource_type: ContentResourceType
}

interface Props {
  item: ContentItemView
  phaseId: string
  /** Initial completion state from the server. */
  initialCompleted: boolean
  /**
   * If false the row is read-only (admins, facilitators previewing
   * cohort content) - the completion toggle is hidden but everything
   * else still renders.
   */
  showCompletion: boolean
}

/**
 * Single content item rendered inside a phase view. Shows the
 * resource-type badge, title, optional description and inline body,
 * an optional outbound URL, and (for fellows only) a completion
 * checkbox that persists optimistically via `toggleItemCompletion`.
 */
export function ContentItemCard({
  item,
  phaseId,
  initialCompleted,
  showCompletion,
}: Props) {
  const [completed, setCompleted] = useState(initialCompleted)
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    const next = !completed
    // Optimistic flip; the server action revalidates the page on
    // success so any phase-level progress UI updates with the next
    // navigation. On error we roll back so the local checkbox doesn't
    // diverge from the database.
    setCompleted(next)
    startTransition(async () => {
      const r = await toggleItemCompletion(item.id, phaseId, next)
      if (!r.ok) setCompleted(!next)
    })
  }

  return (
    <article
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-colors',
        completed && 'border-primary/40 bg-primary/[0.02]',
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <span className="inline-flex w-fit items-center rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {CONTENT_RESOURCE_TYPE_LABELS[item.resource_type]}
          </span>
          <h3 className="text-pretty text-base font-semibold leading-snug text-foreground">
            {item.title}
          </h3>
          {item.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </div>

        {showCompletion && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            aria-pressed={completed}
            aria-label={completed ? 'Mark as incomplete' : 'Mark as complete'}
            className={cn(
              'flex h-8 shrink-0 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-colors',
              completed
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-foreground hover:text-foreground',
              pending && 'opacity-60',
            )}
          >
            <span
              className={cn(
                'flex h-4 w-4 items-center justify-center rounded-full border',
                completed
                  ? 'border-primary-foreground/40 bg-primary-foreground/10'
                  : 'border-border',
              )}
            >
              {completed && <Check className="h-3 w-3" aria-hidden="true" />}
            </span>
            {completed ? 'Completed' : 'Mark complete'}
          </button>
        )}
      </header>

      {item.body && (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {item.body}
        </div>
      )}

      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground hover:border-foreground"
        >
          Open resource
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </a>
      )}
    </article>
  )
}
