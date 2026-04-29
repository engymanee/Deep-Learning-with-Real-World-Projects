import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsFor } from '@/lib/types/profile'

export interface CommunityPostListItem {
  id: string
  title: string
  excerpt: string | null
  cover_url: string | null
  published_at: string | null
  kind: string
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  posts: CommunityPostListItem[]
  /** Heading shown when `posts` is empty. */
  emptyTitle: string
  /** Body shown when `posts` is empty. */
  emptyCopy: string
}

/**
 * Shared feed renderer used by every Community section that surfaces
 * posts (What's New?, Reflections, Wins, Ask). Renders one card per
 * post with the author's headshot, name, date, title, and excerpt.
 * The cover image, when set, sits as a thumbnail on the right at sm+.
 *
 * The whole card is a link to /community/stories/[id], which already
 * handles the full post view + draft-only-for-staff gating.
 */
export function PostFeed({ posts, emptyTitle, emptyCopy }: Props) {
  if (posts.length === 0) {
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
    <ul className="flex flex-col gap-3">
      {posts.map((post) => (
        <PostFeedItem key={post.id} post={post} />
      ))}
    </ul>
  )
}

function PostFeedItem({ post }: { post: CommunityPostListItem }) {
  const authorName =
    post.author?.full_name?.trim() || post.author?.email || 'Anonymous'
  const initials = initialsFor(post.author?.full_name, post.author?.email)

  const dateLabel = post.published_at
    ? new Date(post.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  return (
    <li>
      <Link
        href={`/community/stories/${post.id}`}
        className="group flex gap-4 rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm sm:p-5"
      >
        <Avatar className="h-10 w-10 shrink-0 sm:h-12 sm:w-12">
          {post.author?.avatar_url ? (
            <AvatarImage src={post.author.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-xs font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="truncate font-medium text-foreground">
              {authorName}
            </span>
            {dateLabel && (
              <>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{dateLabel}</span>
              </>
            )}
          </div>

          <h3 className="text-pretty font-serif text-lg leading-snug text-foreground group-hover:text-primary">
            {post.title}
          </h3>

          {post.excerpt && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          )}

          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Read more
            <ArrowRight className="h-3 w-3" aria-hidden="true" />
          </span>
        </div>

        {post.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.cover_url}
            alt=""
            className="hidden h-24 w-32 shrink-0 rounded-md object-cover sm:block"
            loading="lazy"
          />
        )}
      </Link>
    </li>
  )
}
