import { requireUser } from '@/lib/auth-server'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { AsksFilters } from '@/components/community/asks-filters'
import { FeedSearchBar } from '@/components/community/feed-search-bar'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'
import {
  ASK_CATEGORY_VALUES,
  type AskStatus,
} from '@/lib/community/ask-categories'
import { Footer } from '@/components/footer'

export const metadata = {
  title: 'Ask the Community | Leadership Fellowship',
}

const ASK_STATUSES: ReadonlyArray<AskStatus> = ['open', 'answered', 'closed']

interface PageProps {
  searchParams: Promise<{
    q?: string
    category?: string
    status?: string
  }>
}

/**
 * /community/ask - Open questions, challenges, and peer support.
 * Open to every authenticated user.
 *
 * Searchable + filterable by category and lifecycle status. The
 * filters live in the URL so the view is shareable and the back
 * button works the way users expect.
 */
export default async function AskPage({ searchParams }: PageProps) {
  const user = await requireUser()
  const sp = await searchParams
  const section = getSectionBySlug('ask')!

  // Validate filter values - silently drop unknown ones rather than
  // erroring, so a stale URL doesn't blow up the page.
  const askCategory = sp.category && ASK_CATEGORY_VALUES.includes(sp.category as never)
    ? sp.category
    : undefined
  const askStatus = sp.status && (ASK_STATUSES as readonly string[]).includes(sp.status)
    ? sp.status
    : undefined

  const posts = await loadSectionPosts('ask', {
    query: sp.q ?? undefined,
    askCategory,
    askStatus,
  })

  const isStaff = user.role === 'admin' || user.role === 'facilitator'

  return (
    <>
      <div className="flex flex-col">
      <SectionHeader
        section={section}
        count={posts.length}
        canPost={true}
        requireAskCategory
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FeedSearchBar
          placeholder="Search asks - title, body, or #hashtag"
          className="sm:w-72"
        />
        <AsksFilters />
      </div>
      <PostFeed
        posts={posts}
        emptyTitle={section.emptyTitle}
        emptyCopy={section.emptyCopy}
        isStaff={isStaff}
      />
    </div>
    <Footer />
    </>
  )
}
