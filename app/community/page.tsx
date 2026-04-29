import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { COMMUNITY_SECTIONS } from '@/lib/community/sections'
import {
  PostFeed,
  type CommunityPostListItem,
} from '@/components/community/post-feed'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Community | Leadership Fellowship',
  description:
    'A combined view of recent activity across the Fellowship - announcements, reflections, wins, and questions.',
}

/**
 * /community (overview).
 *
 * The persistent left rail (rendered by the layout) handles section
 * navigation. This page complements it with two things:
 *
 *   1. A "Recent activity" feed - the latest 12 posts across every
 *      section, so a returning user can scan everything new without
 *      visiting four pages.
 *   2. A grid of section tiles with the section's count, so the
 *      sidebar's information is reachable on mobile (where the rail
 *      collapses into a horizontal pill row above the content).
 */
interface RawPostRow {
  id: string
  kind: string
  title: string
  excerpt: string | null
  cover_url: string | null
  published_at: string | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

export default async function CommunityOverviewPage() {
  await requireUser()
  const supabase = await createClient()

  // We query published posts across every kind that maps to a
  // section, ordered by publish date. 12 is enough to fill a screen
  // without making the overview heavier than the section pages.
  const allPostKinds = COMMUNITY_SECTIONS.flatMap((s) => s.postKinds ?? [])

  const recentPromise = supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, cover_url, published_at,
      author:created_by ( id, full_name, email, avatar_url )
      `,
    )
    .in('kind', allPostKinds)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(12)
    .returns<RawPostRow[]>()

  // Per-section counts so the tile grid matches the sidebar pills.
  const countPromises = COMMUNITY_SECTIONS.map((s) => {
    if (s.postKinds === null) {
      return supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .in('role', ['fellow', 'facilitator'])
        .is('deactivated_at', null)
    }
    return supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .in('kind', s.postKinds)
      .not('published_at', 'is', null)
  })

  const [recentRes, ...countResults] = await Promise.all([
    recentPromise,
    ...countPromises,
  ])

  const counts = COMMUNITY_SECTIONS.map((s, i) => ({
    section: s,
    count: countResults[i].count ?? 0,
  }))

  const recent: CommunityPostListItem[] = (recentRes.data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    cover_url: p.cover_url,
    published_at: p.published_at,
    kind: p.kind,
    author: p.author,
  }))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Community of Practice
        </p>
        <h1 className="font-serif text-3xl text-foreground sm:text-4xl">
          Welcome to the Fellowship
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Browse fellow bios, catch up on what is new, share reflections and
          wins, and ask the community when you are stuck.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Explore by section
          </h2>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {counts.map(({ section, count }) => {
            const Icon = section.icon
            return (
              <li key={section.id}>
                <Link
                  href={`/community/${section.slug}`}
                  className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <Badge variant="outline" className="text-xs tabular-nums">
                      {count}
                    </Badge>
                  </div>
                  <h3 className="font-serif text-base text-foreground group-hover:text-primary">
                    {section.label}
                  </h3>
                  <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {section.description}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-serif text-xl text-foreground">
            Recent activity
          </h2>
        </div>
        <PostFeed
          posts={recent}
          emptyTitle="Nothing posted yet"
          emptyCopy="As fellows share announcements, reflections, wins, and questions, they will surface here."
        />
      </section>
    </div>
  )
}
