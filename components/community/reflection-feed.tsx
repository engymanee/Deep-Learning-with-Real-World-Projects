import { Eye, EyeOff, Lock, MessageCircle, Sparkles } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ReflectionVisibilityToggle } from '@/components/community/reflection-visibility-toggle'
import { CommentThread } from '@/components/community/comment-thread'
import { initialsFor } from '@/lib/types/profile'
import type {
  CommentItem,
  ReflectionFeedItem,
} from '@/lib/community/load-reflections'

interface Props {
  reflections: ReflectionFeedItem[]
  /**
   * Comments grouped by reflection id. The page loader fetches these
   * in a single round-trip and groups them so each card can render
   * its thread without an extra fetch.
   */
  commentsByReflection: Map<string, CommentItem[]>
  currentUser: {
    id: string
    fullName: string | null
    email: string | null
    avatarUrl: string | null
    isAdmin: boolean
  }
  /** Empty-state copy shown when the feed has no items. */
  emptyTitle: string
  emptyCopy: string
}

/**
 * Server component that renders the Reflections feed sourced from
 * `user_content_reflections`. Each card combines:
 *   - Author header (avatar + name + relative date)
 *   - The lab the reflection was attached to (with prompt as a
 *     muted quote when present)
 *   - The reflection body
 *   - Visibility chip (and a toggle for the author)
 *   - Inline `CommentThread`
 *
 * No client logic here - the only interactive bits are the
 * `CommentThread` and `ReflectionVisibilityToggle`, which are their
 * own client components.
 */
export function ReflectionFeed({
  reflections,
  commentsByReflection,
  currentUser,
  emptyTitle,
  emptyCopy,
}: Props) {
  if (reflections.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-10 text-center">
        <h2 className="font-serif text-lg text-foreground">{emptyTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {emptyCopy}
        </p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-5">
      {reflections.map((r) => (
        <li key={r.id}>
          <ReflectionCard
            reflection={r}
            comments={commentsByReflection.get(r.id) ?? []}
            currentUser={currentUser}
          />
        </li>
      ))}
    </ul>
  )
}

function ReflectionCard({
  reflection,
  comments,
  currentUser,
}: {
  reflection: ReflectionFeedItem
  comments: CommentItem[]
  currentUser: Props['currentUser']
}) {
  const authorName =
    reflection.author?.full_name?.trim() ||
    reflection.author?.email ||
    'Anonymous'
  const initials = initialsFor(
    reflection.author?.full_name,
    reflection.author?.email,
  )
  const isOwner =
    !!reflection.author && reflection.author.id === currentUser.id

  const dateLabel = new Date(reflection.created_at).toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    },
  )

  return (
    <article className="flex flex-col gap-4 rounded-lg border border-border bg-card p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0">
            {reflection.author?.avatar_url ? (
              <AvatarImage src={reflection.author.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-xs font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{authorName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {dateLabel}
              {reflection.content?.title ? ` · ${reflection.content.title}` : ''}
              {reflection.content?.year_id
                ? ` · ${reflection.content.year_id}`
                : ''}
            </p>
          </div>
        </div>

        {/*
          Visibility chip + toggle. Non-authors see a read-only
          chip; authors see a popover to flip between values.
        */}
        {isOwner ? (
          <ReflectionVisibilityToggle
            reflectionId={reflection.id}
            value={reflection.visibility}
          />
        ) : (
          <VisibilityChip value={reflection.visibility} />
        )}
      </header>

      {/* Prompt comes from `labs.reflection_prompt` and is rendered as
          a quoted block so the response context is obvious. */}
      {reflection.content?.prompt && (
        <blockquote className="flex gap-2 rounded-md border-l-2 border-primary/40 bg-muted/40 px-3 py-2 text-sm italic leading-relaxed text-muted-foreground">
          <Sparkles
            className="mt-0.5 h-4 w-4 shrink-0 text-primary"
            aria-hidden="true"
          />
          <span>{reflection.content.prompt}</span>
        </blockquote>
      )}

      <p className="whitespace-pre-wrap text-pretty text-sm leading-relaxed text-foreground">
        {reflection.body}
      </p>

      <footer className="flex items-center gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
          {comments.filter((c) => !c.is_deleted).length}{' '}
          {comments.filter((c) => !c.is_deleted).length === 1
            ? 'comment'
            : 'comments'}
        </span>
      </footer>

      <CommentThread
        subjectType="reflection"
        subjectId={reflection.id}
        comments={comments}
        currentUser={currentUser}
      />
    </article>
  )
}

function VisibilityChip({
  value,
}: {
  value: ReflectionFeedItem['visibility']
}) {
  if (value === 'private') {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Lock className="h-3 w-3" aria-hidden="true" />
        Private
      </Badge>
    )
  }
  if (value === 'cohort') {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <EyeOff className="h-3 w-3" aria-hidden="true" />
        Cohort only
      </Badge>
    )
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <Eye className="h-3 w-3" aria-hidden="true" />
      Public
    </Badge>
  )
}
