import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { initialsFor } from '@/lib/types/profile'

export const metadata = {
  title: 'Story | Leadership Fellowship',
}

interface StoryAuthor {
  id: string
  full_name: string | null
  avatar_url: string | null
  email: string | null
  title: string | null
  cohort: string | null
}

interface StoryRow {
  id: string
  kind: string
  title: string
  excerpt: string | null
  body: string | null
  cover_url: string | null
  media_url: string | null
  published_at: string | null
  author: StoryAuthor | null
}

/**
 * /community/stories/[id] - full-bleed reader for a Community story.
 *
 * Auth-gated like the rest of the app (requireUser redirects to
 * /auth/login). Unpublished posts (published_at IS NULL) 404 for
 * everyone except admins / facilitators so authors can preview.
 *
 * Body is rendered as plain whitespace-pre-wrap. We deliberately
 * avoid markdown for now - admin authoring writes plain text, and
 * adding a renderer would expand the trust surface (XSS, link
 * sanitisation) without adding obvious value.
 */
export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const { data } = await supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, body, cover_url, media_url, published_at,
      author:created_by (
        id, full_name, avatar_url, email, title, cohort
      )
    `,
    )
    .eq('id', id)
    .maybeSingle<StoryRow>()

  if (!data) notFound()

  const canSeeUnpublished = user.role === 'admin' || user.role === 'facilitator'
  if (!data.published_at && !canSeeUnpublished) notFound()

  const author = data.author
  const authorName = author?.full_name?.trim() || author?.email || 'Unknown author'
  const initials = initialsFor(author?.full_name, author?.email)
  const publishedLabel = data.published_at
    ? new Date(data.published_at).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Unpublished draft'

  const kindLabel =
    data.kind === 'audio'
      ? 'Audio'
      : data.kind === 'video'
        ? 'Video'
        : 'Story'

  // The /community layout already renders the TopBar, sidebar, and
  // outer container. This page is just the article content; the
  // sidebar stays accessible for quick nav back to other sections.
  return (
    <div className="mx-auto w-full max-w-3xl">
      <Link
        href="/community"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to Community
      </Link>

      <article className="mt-6 flex flex-col gap-6">
          {data.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={data.cover_url}
              alt=""
              className="aspect-[16/9] w-full rounded-lg border border-border object-cover"
            />
          )}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="text-[10px] uppercase">
                {kindLabel}
              </Badge>
              {!data.published_at && (
                <Badge variant="secondary" className="text-[10px] uppercase">
                  Draft
                </Badge>
              )}
            </div>
            <h1 className="font-serif text-3xl text-foreground text-balance sm:text-4xl">
              {data.title}
            </h1>
            {data.excerpt && (
              <p className="text-pretty text-base leading-relaxed text-muted-foreground">
                {data.excerpt}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3 border-y border-border py-4">
            <Avatar className="h-10 w-10 shrink-0">
              {author?.avatar_url ? (
                <AvatarImage src={author.avatar_url} alt="" />
              ) : null}
              <AvatarFallback className="text-xs font-medium">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {authorName}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {publishedLabel}
                {author?.title ? ` · ${author.title}` : ''}
              </p>
            </div>
            {author?.cohort && (
              <Badge variant="outline" className="text-xs">
                Cohort {author.cohort}
              </Badge>
            )}
          </div>

          {data.media_url && data.kind !== 'story' && (
            <a
              href={data.media_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              Open {kindLabel.toLowerCase()} in a new tab
            </a>
          )}

        {data.body && (
          <div className="whitespace-pre-wrap text-pretty text-base leading-relaxed text-foreground">
            {data.body}
          </div>
        )}
      </article>
    </div>
  )
}
