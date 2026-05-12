import 'server-only'
import { createClient } from '@/lib/supabase/server'

/**
 * Load all public reflections for the community feed
 * with reactions and comment counts
 */
export async function loadReflectionFeed(options: {
  limit?: number
  offset?: number
  sortBy?: 'recent' | 'popular'
} = {}) {
  const { limit = 20, offset = 0, sortBy = 'recent' } = options
  const supabase = await createClient()

  let query = supabase
    .from('user_content_reflections')
    .select(
      `
      id,
      body,
      content_item_id,
      profile_id,
      created_at,
      updated_at,
      content_item:content_item_id (
        id,
        title
      ),
      profile:profile_id (
        id,
        full_name,
        email,
        avatar_url
      ),
      reactions:reflection_reactions(reaction_type),
      comment_count:community_comments(count)
      `,
      { count: 'exact' },
    )
    .eq('visibility', 'public')
    .not('body', 'is', null)

  if (sortBy === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else if (sortBy === 'popular') {
    // Could order by reaction count or comment count
    query = query.order('updated_at', { ascending: false })
  }

  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('[Reflection Feed Error]', error)
    return { reflections: [], total: 0 }
  }

  // Process reactions into aggregated counts
  const reflections = (data ?? []).map((item: any) => {
    const reactionCounts = {
      like: 0,
      love: 0,
      inspire: 0,
      helpful: 0,
    }

    const reactions = item.reactions as Array<{ reaction_type: string }> | null
    if (reactions) {
      reactions.forEach((r) => {
        if (r.reaction_type in reactionCounts) {
          reactionCounts[r.reaction_type as keyof typeof reactionCounts]++
        }
      })
    }

    const contentItem = Array.isArray(item.content_item) ? item.content_item[0] : item.content_item
    const profile = Array.isArray(item.profile) ? item.profile[0] : item.profile

    return {
      id: item.id,
      body: item.body,
      title: contentItem?.title || 'Reflection',
      contentTitle: contentItem?.title || 'Content',
      author: {
        id: profile?.id || '',
        full_name: profile?.full_name || 'Anonymous',
        avatar_url: profile?.avatar_url || undefined,
      },
      created_at: item.created_at,
      reactions: reactionCounts,
      commentCount: 0, // TODO: calculate from comment_count
    }
  })

  return {
    reflections,
    total: count ?? 0,
  }
}

/**
 * Load a single reflection with all its reactions and comments
 */
export async function loadReflectionDetail(reflectionId: string) {
  const supabase = await createClient()

  // Load reflection with reactions
  const { data: reflection, error } = await supabase
    .from('user_content_reflections')
    .select(
      `
      id,
      body,
      content_item_id,
      profile_id,
      created_at,
      content_item:content_item_id (
        id,
        title
      ),
      profile:profile_id (
        id,
        full_name,
        email,
        avatar_url
      )
      `,
    )
    .eq('id', reflectionId)
    .eq('visibility', 'public')
    .single()

  if (error || !reflection) {
    return null
  }

  // Load reactions
  const { data: reactions } = await supabase
    .from('reflection_reactions')
    .select('reaction_type')
    .eq('reflection_id', reflectionId)

  // Load comments
  const { data: comments } = await supabase
    .from('community_comments')
    .select(
      `
      id,
      body,
      created_at,
      parent_comment_id,
      profile:profile_id (
        id,
        full_name,
        avatar_url
      )
      `,
    )
    .eq('subject_id', reflectionId)
    .eq('subject_type', 'reflection')
    .order('created_at', { ascending: true })

  // Aggregate reaction counts
  const reactionCounts = {
    like: 0,
    love: 0,
    inspire: 0,
    helpful: 0,
  }

  if (reactions) {
    reactions.forEach((r) => {
      if (r.reaction_type in reactionCounts) {
        reactionCounts[r.reaction_type as keyof typeof reactionCounts]++
      }
    })
  }

  const contentItem = Array.isArray(reflection.content_item) ? reflection.content_item[0] : reflection.content_item
  const profile = Array.isArray(reflection.profile) ? reflection.profile[0] : reflection.profile

  return {
    id: reflection.id,
    body: reflection.body,
    title: contentItem?.title || 'Reflection',
    contentTitle: contentItem?.title || 'Content',
    author: {
      id: profile?.id || '',
      full_name: profile?.full_name || 'Anonymous',
      avatar_url: profile?.avatar_url || undefined,
    },
    created_at: reflection.created_at,
    reactions: reactionCounts,
    comments: comments || [],
    commentCount: comments?.length || 0,
  }
}
