import { requireUser } from '@/lib/auth-server'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'

export const metadata = {
  title: "What's New? | Community | Leadership Fellowship",
}

/**
 * /community/whats-new - Announcements feed.
 * Composer is staff-only (admins + facilitators).
 */
export default async function WhatsNewPage() {
  const user = await requireUser()
  const section = getSectionBySlug('whats-new')!
  const posts = await loadSectionPosts('whats-new')

  const canPost =
    !section.staffOnly ||
    user.role === 'admin' ||
    user.role === 'facilitator'

  return (
    <>
      <div className="flex flex-col">
      <SectionHeader
        section={section}
        count={posts.length}
        canPost={canPost}
      />
      <PostFeed
        posts={posts}
        emptyTitle={section.emptyTitle}
        emptyCopy={section.emptyCopy}
      />
    </div>
    </>
  )
}
