import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { ReflectionFeed } from '@/components/community/reflection-feed'
import { SectionHeader } from '@/components/community/section-header'
import { getSectionBySlug } from '@/lib/community/sections'
import {
  loadReflectionFeed,
  type CommentItem,
} from '@/lib/community/load-reflections'

export const metadata = {
  title: 'Fellow Reflections | Community | Leadership Fellowship',
}

interface RawCommentRow {
  id: string
  body: string
  created_at: string
  updated_at: string | null
  parent_comment_id: string | null
  deleted_at: string | null
  subject_id: string
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/**
 * /community/reflections — programme-driven reflections feed.
 *
 * Sourced from `user_content_reflections` joined to `labs`. Authors
 * write reflections via the lab UI in /phases; this page surfaces
 * the public/cohort ones to peers and lets everyone comment.
 */
export default async function ReflectionsPage() {
  const user = await requireUser()
  const section = getSectionBySlug('reflections')!
  const reflections = await loadReflectionFeed({ limit: 50 })

  // Single grouped fetch for all comment rows tied to the
  // reflections we just loaded. Keeps the render side as one round
  // trip per parent table even when the feed has dozens of items.
  const ids = reflections.map((r) => r.id)
  const commentsByReflection = new Map<string, CommentItem[]>()

  if (ids.length > 0) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('community_comments')
      .select(
        `id, body, created_at, updated_at, parent_comment_id, deleted_at,
         subject_id,
         author:profile_id ( id, full_name, email, avatar_url )`,
      )
      .eq('subject_type', 'reflection')
      .in('subject_id', ids)
      .order('created_at', { ascending: true })
      .returns<RawCommentRow[]>()

    for (const c of data ?? []) {
      const list = commentsByReflection.get(c.subject_id) ?? []
      list.push({
        id: c.id,
        body: c.deleted_at ? '' : c.body,
        created_at: c.created_at,
        updated_at: c.updated_at,
        parent_comment_id: c.parent_comment_id,
        is_deleted: c.deleted_at !== null,
        author: c.author,
      })
      commentsByReflection.set(c.subject_id, list)
    }
  }

  // Shape the user object for client components. Strip the secrets
  // and just pass the bits the comment thread + visibility toggle
  // need to render the right affordances.
  const viewer = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    avatarUrl: user.profileImageUrl ?? null,
    isAdmin: user.role === 'admin',
  }

  return (
    <div className="flex flex-col">
      {/*
        canPost is hardwired to false because reflections are now
        produced exclusively from programme content. SectionHeader
        also won't render its composer because we set
        section.writeKind = null in lib/community/sections.ts.
      */}
      <SectionHeader
        section={section}
        count={reflections.length}
        canPost={false}
      />

      <ReflectionFeed
        reflections={reflections}
        commentsByReflection={commentsByReflection}
        currentUser={viewer}
        emptyTitle={section.emptyTitle}
        emptyCopy={section.emptyCopy}
      />
    </div>
  )
}
