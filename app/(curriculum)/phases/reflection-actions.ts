'use server'

import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'

/**
 * Update reflection visibility after submission to make it instantly
 * visible in the community feed. Called after form submission succeeds.
 */
export async function makeReflectionPublic(reflectionId: string) {
  const user = await requireUser()
  const supabase = await createClient()

  const { error } = await supabase
    .from('user_content_reflections')
    .update({ visibility: 'public' })
    .eq('id', reflectionId)
    .eq('profile_id', user.id)

  if (error) {
    return {
      ok: false,
      message: 'Failed to publish reflection to community',
    }
  }

  return { ok: true }
}

/**
 * Create a reaction on a reflection (like, love, inspire, etc.)
 */
export async function addReactionToReflection(
  reflectionId: string,
  reactionType: 'like' | 'love' | 'inspire' | 'helpful',
) {
  const user = await requireUser()
  const supabase = await createClient()

  // Check if user already reacted with this type
  const { data: existing } = await supabase
    .from('reflection_reactions')
    .select('id')
    .eq('reflection_id', reflectionId)
    .eq('user_id', user.id)
    .eq('reaction_type', reactionType)
    .maybeSingle()

  if (existing) {
    // Already reacted, remove it (toggle off)
    const { error } = await supabase
      .from('reflection_reactions')
      .delete()
      .eq('id', existing.id)

    return { ok: !error, removed: true }
  }

  // Add new reaction
  const { error } = await supabase.from('reflection_reactions').insert({
    reflection_id: reflectionId,
    user_id: user.id,
    reaction_type: reactionType,
  })

  if (error) {
    return { ok: false, message: 'Failed to add reaction' }
  }

  return { ok: true, removed: false }
}

/**
 * Add a comment to a reflection
 */
export async function addCommentToReflection(
  reflectionId: string,
  body: string,
  parentCommentId?: string | null,
) {
  const user = await requireUser()
  const supabase = await createClient()

  if (!body.trim()) {
    return { ok: false, message: 'Comment cannot be empty' }
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      subject_type: 'reflection',
      subject_id: reflectionId,
      profile_id: user.id,
      body: body.trim(),
      parent_comment_id: parentCommentId || null,
    })
    .select('id')
    .single()

  if (error) {
    return { ok: false, message: 'Failed to post comment' }
  }

  return { ok: true, commentId: data.id }
}
