import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSectionBySlug } from '@/lib/community/sections'
import type { CommunityPostListItem } from '@/components/community/post-feed'

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

/**
 * Load published posts for a single Community section, identified by
 * its slug. Centralises the query + author embed + ordering so each
 * section page is a small wrapper around this call.
 *
 * Throws if the slug doesn't match a known section or the section
 * isn't a post feed (e.g. bios) - that would be a programming
 * error, not a runtime user error.
 */
export async function loadSectionPosts(
  slug: string,
): Promise<CommunityPostListItem[]> {
  const section = getSectionBySlug(slug)
  if (!section) throw new Error(`Unknown community section: ${slug}`)
  if (!section.postKinds) {
    throw new Error(`Section ${slug} is not a post feed`)
  }

  const supabase = await createClient()
  const { data } = await supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, cover_url, published_at,
      author:created_by ( id, full_name, email, avatar_url )
      `,
    )
    .in('kind', section.postKinds)
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(100)
    .returns<RawPostRow[]>()

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    cover_url: p.cover_url,
    published_at: p.published_at,
    kind: p.kind,
    author: p.author,
  }))
}
