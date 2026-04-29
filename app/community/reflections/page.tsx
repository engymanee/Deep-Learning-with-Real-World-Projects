import { requireUser } from '@/lib/auth-server'
import { PostFeed } from '@/components/community/post-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import { loadSectionPosts } from '@/lib/community/load-section'

export const metadata = {
  title: 'Fellow Reflections | Community | Leadership Fellowship',
}

/**
 * /community/reflections - Stories and reflections from fellows.
 * Open to every authenticated user.
 */
export default async function ReflectionsPage() {
  await requireUser()
  const section = getSectionBySlug('reflections')!
  const posts = await loadSectionPosts('reflections')

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
