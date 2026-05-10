import { requireUser } from '@/lib/auth-server'
import { FeedSearchBar } from '@/components/community/feed-search-bar'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'
import { loadPwfProtocols } from '@/lib/community/load-frameworks'

export const metadata = {
  title: 'Wins & Progress | Community | Leadership Fellowship',
}

interface PageProps {
  // Next.js 16: searchParams is now async. We await to read `q`.
  searchParams: Promise<{ q?: string | string[] }>
}

/**
 * /community/wins - Celebrations of how schools are applying the
 * framework. Open to every authenticated user. Composer surfaces a
 * curated PWF Protocol dropdown so wins are attributable to a
 * specific framework, and the feed supports hashtag/text search via
 * the URL `?q=` param.
 */
export default async function WinsPage({ searchParams }: PageProps) {
  const user = await requireUser()
  const sp = await searchParams
  // searchParams values are string | string[] | undefined. We only
  // care about the first scalar.
  const rawQ = Array.isArray(sp.q) ? sp.q[0] : sp.q
  const query = (rawQ ?? '').trim()

  const section = getSectionBySlug('wins')!
  const [posts, frameworks] = await Promise.all([
    loadSectionPosts('wins', { query: query || undefined }),
    loadPwfProtocols(),
  ])

  const isStaff = user.role === 'admin' || user.role === 'facilitator'

  return (
    <div className="flex flex-col gap-4">
      <SectionHeader
        section={section}
        count={posts.length}
        canPost={true}
        frameworks={frameworks}
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <FeedSearchBar placeholder="Search wins, hashtags, frameworks…" />
        {query && (
          <p className="text-xs text-muted-foreground">
            Showing wins matching{' '}
            <span className="font-medium text-foreground">“{query}”</span>
          </p>
        )}
      </div>

      <PostFeed
        posts={posts}
        emptyTitle={
          query
            ? 'No wins match that search'
            : section.emptyTitle
        }
        emptyCopy={
          query
            ? 'Try a different keyword or hashtag, or clear the search to see every win.'
            : section.emptyCopy
        }
        isStaff={isStaff}
      />
    </div>
  )
}
