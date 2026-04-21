'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  PlayCircle,
  MessageSquare,
  ListChecks,
  Video,
  FileText,
  ClipboardCheck,
  Target,
  ExternalLink,
  Check,
  Clock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleBlockCompletion } from '@/app/labs/[labId]/actions'

export type BlockType =
  | 'reading'
  | 'video'
  | 'reflection_prompt'
  | 'protocol'
  | 'session_link'
  | 'slides'
  | 'survey'
  | 'follow_up_task'

export interface LabBlock {
  id: string
  block_type: BlockType
  title: string
  body: string | null
  url: string | null
  duration_minutes: number | null
  is_optional: boolean
}

interface LabBlockCardProps {
  block: LabBlock
  labId: string
  initialCompleted: boolean
}

const BLOCK_META: Record<BlockType, { icon: LucideIcon; label: string; accent: string }> = {
  reading:           { icon: BookOpen,        label: 'Reading',           accent: 'text-primary' },
  video:             { icon: Video,           label: 'Video',             accent: 'text-primary' },
  reflection_prompt: { icon: MessageSquare,   label: 'Reflection',        accent: 'text-accent'  },
  protocol:          { icon: ListChecks,      label: 'Protocol',          accent: 'text-primary' },
  session_link:      { icon: PlayCircle,      label: 'Live session',      accent: 'text-primary' },
  slides:            { icon: FileText,        label: 'Slides',            accent: 'text-text-muted' },
  survey:            { icon: ClipboardCheck,  label: 'Survey',            accent: 'text-accent'  },
  follow_up_task:    { icon: Target,          label: 'Follow-up task',    accent: 'text-primary' },
}

export function LabBlockCard({ block, labId, initialCompleted }: LabBlockCardProps) {
  // Optimistic local state so the UI reacts immediately.
  const [completed, setCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const meta = BLOCK_META[block.block_type]
  const Icon = meta.icon

  const handleToggle = () => {
    const next = !completed
    setCompleted(next)
    setError(null)

    startTransition(async () => {
      const result = await toggleBlockCompletion(block.id, labId, next)
      if (!result.ok) {
        // Roll back on failure.
        setCompleted(!next)
        setError(result.message)
      }
    })
  }

  return (
    <article
      className={cn(
        'group relative rounded-lg border bg-card text-card-foreground transition-colors',
        completed
          ? 'border-primary/40 bg-primary/[0.02]'
          : 'border-border hover:border-primary/30',
      )}
    >
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:gap-4">
        {/* Icon */}
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-bg-subtle',
            meta.accent,
          )}
          aria-hidden="true"
        >
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
              {meta.label}
            </span>
            {block.is_optional && (
              <span className="rounded-sm bg-bg-muted px-1.5 py-0.5 text-xs text-text-muted">
                Optional
              </span>
            )}
            {block.duration_minutes != null && (
              <span className="inline-flex items-center gap-1 text-xs text-text-muted">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {block.duration_minutes} min
              </span>
            )}
          </div>

          <h3 className="mt-1 text-base font-semibold leading-snug text-text">
            {block.title}
          </h3>

          {block.body && (
            <p className="mt-2 text-sm leading-relaxed text-text-muted">{block.body}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            {block.url && (
              <Link
                href={block.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text hover:bg-bg-subtle"
              >
                {block.block_type === 'session_link'
                  ? 'Join session'
                  : block.block_type === 'video'
                  ? 'Watch'
                  : block.block_type === 'survey'
                  ? 'Open survey'
                  : block.block_type === 'slides'
                  ? 'Download'
                  : 'Open'}
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </Link>
            )}

            <button
              type="button"
              onClick={handleToggle}
              disabled={isPending}
              aria-pressed={completed}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                completed
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border border-border text-text hover:bg-bg-subtle',
                isPending && 'opacity-60',
              )}
            >
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-sm border',
                  completed ? 'border-primary-foreground bg-primary-foreground/10' : 'border-border',
                )}
                aria-hidden="true"
              >
                {completed && <Check className="h-3 w-3" />}
              </span>
              {completed ? 'Completed' : 'Mark complete'}
            </button>

            {error && (
              <span className="text-xs text-danger" role="alert">
                {error}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
