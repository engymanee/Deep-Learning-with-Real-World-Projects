import { requireUser } from '@/lib/auth-server'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'

export const metadata = {
  title: 'Wins & Progress | Community | Leadership Fellowship',
}

/**
 * /community/wins - Celebrations of how schools are applying the framework.
 * Open to every authenticated user.
 */
export default async function WinsPage() {
  await requireUser()
  const section = getSectionBySlug('wins')!
  const posts = await loadSectionPosts('wins')

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
