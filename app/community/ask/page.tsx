import { requireUser } from '@/lib/auth-server'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'

export const metadata = {
  title: 'Ask the Community | Leadership Fellowship',
}

/**
 * /community/ask - Open questions, challenges, and peer support.
 * Open to every authenticated user.
 */
export default async function AskPage() {
  await requireUser()
  const section = getSectionBySlug('ask')!
  const posts = await loadSectionPosts('ask')

  return (
    <div className="flex flex-col">
      <SectionHeader section={section} count={posts.length} canPost={true} />
      <PostFeed
        posts={posts}
        emptyTitle={section.emptyTitle}
        emptyCopy={section.emptyCopy}
      />
    </div>
  )
}
