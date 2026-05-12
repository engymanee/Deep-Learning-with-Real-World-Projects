'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth-server'
import {
  WRITABLE_KINDS,
  getSectionBySlug,
  slugForKind,
  COMMUNITY_SECTIONS,
} from '@/lib/community/sections'

const MAX_TITLE = 200
const MAX_BODY = 10_000
const MAX_EXCERPT = 280

/** Categories permitted on Ask posts; mirrors the DB check constraint. */
const ASK_CATEGORIES = new Set([
  'general',
  'instructional',
  'school_team',
  'waw',
])

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; message: string }

/**
 * Create a new community post in the section identified by `kind`.
 *
 * Validation:
 *   - Caller must be authenticated; preview impersonation cannot post.
 *   - `kind` must be one of the writable section kinds (see
 *     lib/community/sections.ts -> WRITABLE_KINDS).
 *   - Sections marked `staffOnly` only allow admins / facilitators.
 *   - Title required, body required.
 *   - frameworkResourceId, when supplied, must reference a row that
 *     is flagged is_pwf_protocol = true. Only allowed on the wins kind.
 *   - askCategory, when supplied, must be one of the known values
 *     and only allowed on the ask kind.
 *
 * Side effects:
 *   - Inserts the row with `published_at = now()` so it appears in
 *     feeds immediately. (Drafts are an admin-only flow handled by
 *     /admin/community.)
 *   - Auto-derives an excerpt by truncating the body to 280 chars.
 *   - Revalidates the relevant section route + the overview.
 */
export async function createCommunityPost(input: {
  kind: string
  title: string
  body: string
  frameworkResourceId?: string | null
  askCategory?: string | null
  starRating?: number | null
  visibility?: 'public' | 'cohort' | 'school_team'
}): Promise<CreatePostResult> {
  try {
    const user = await requireUser()

    // Block "preview as fellow" sessions from writing data; the fake
    // `__preview__` id has no real auth.uid backing it.
    if (user.id === '__preview__') {
      return { ok: false, message: 'Cannot post while previewing.' }
    }

    if (!WRITABLE_KINDS.includes(input.kind)) {
      return { ok: false, message: 'Unknown post type.' }
    }

    const slug = slugForKind(input.kind)
    const section = slug ? getSectionBySlug(slug) : null
    if (!section) {
      return { ok: false, message: 'Unknown post type.' }
    }
    if (section.staffOnly && user.role !== 'admin' && user.role !== 'facilitator') {
      return {
        ok: false,
        message: 'Only program staff can post in this section.',
      }
    }

    const title = input.title.trim()
    if (!title) return { ok: false, message: 'Add a title.' }
    if (title.length > MAX_TITLE) {
      return { ok: false, message: 'Title is too long.' }
    }

    const body = input.body.trim()
    if (!body) return { ok: false, message: 'Add some content.' }
    if (body.length > MAX_BODY) {
      return { ok: false, message: 'Post body is too long.' }
    }

    // Framework attribution. Only meaningful on Wins; we silently
    // ignore the field on other kinds rather than returning an error,
    // because the composer might pass null harmlessly.
    let frameworkResourceId: string | null = null
    if (input.frameworkResourceId && input.kind === 'win') {
      // Verify the resource exists AND is flagged as a PWF Protocol.
      // We don't trust the client-side dropdown - admins can flip
      // the flag at any time and we want to reject stale picks.
      const supabase = await createClient()
      const { data: framework } = await supabase
        .from('community_resources')
        .select('id')
        .eq('id', input.frameworkResourceId)
        .eq('is_pwf_protocol', true)
        .maybeSingle()
      if (!framework) {
        return {
          ok: false,
          message: 'That framework is no longer available.',
        }
      }
      frameworkResourceId = framework.id
    }

    // Ask category / status. Required server-side on asks (the
    // composer also enforces it client-side) and ignored elsewhere.
    let askCategory: string | null = null
    let askStatus: string | null = null
    if (input.kind === 'ask') {
      const cat = input.askCategory ?? ''
      if (!ASK_CATEGORIES.has(cat)) {
        return { ok: false, message: 'Pick a category for your question.' }
      }
      askCategory = cat
      askStatus = 'open'
    }

    // Star rating: only allowed on wins, must be 1-5 if provided.
    let starRating: number | null = null
    if (input.kind === 'win' && input.starRating) {
      if (input.starRating < 1 || input.starRating > 5) {
        return { ok: false, message: 'Rating must be between 1 and 5.' }
      }
      starRating = input.starRating
    }

    // Determine visibility - only for wins, defaults to 'public'
    let visibility: string = 'public'
    let visibilityScopeId: string | null = null
    if (input.kind === 'win' && input.visibility) {
      visibility = input.visibility
      // If visibility is cohort or school_team, capture the scope ID from user context
      if (input.visibility === 'cohort' && user.cohort) {
        // Will be populated via user context later
      }
      if (input.visibility === 'school_team' && user.schoolTeamId) {
        // Will be populated via user context later
      }
    }

    // Auto excerpt: first 280 chars of body, ending on a clean break.
    const excerpt =
      body.length > MAX_EXCERPT
        ? `${body.slice(0, MAX_EXCERPT - 1).trimEnd()}…`
        : body

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        kind: input.kind,
        title,
        excerpt,
        body,
        created_by: user.id,
        published_at: new Date().toISOString(),
        framework_resource_id: frameworkResourceId,
        ask_category: askCategory,
        ask_status: askStatus,
        star_rating: starRating,
        visibility: visibility,
        visibility_scope_id: visibilityScopeId,
      })
      .select('id')
      .single()

    if (error) return { ok: false, message: error.message }

    // Bust caches for the section and the overview. Bust every
    // section's cache for the kind to be safe (legacy 'story' rows
    // surface under reflections, etc).
    revalidatePath('/community')
    for (const s of COMMUNITY_SECTIONS) {
      if (s.postKinds?.includes(input.kind)) {
        revalidatePath(`/community/${s.slug}`)
      }
    }

    return { ok: true, postId: data.id }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Failed to create post.',
    }
  }
}

/**
 * Admin moderation: feature/unfeature a post (pin to top of feed)
 * and archive/unarchive (hide from non-admins). Only callable by
 * admins or facilitators.
 */
export async function setPostFeatured(input: {
  postId: string
  featured: boolean
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'facilitator') {
    return { ok: false, message: 'Only program staff can feature posts.' }
  }
  // Use the admin client because RLS on community_posts only lets the
  // post author update; staff need to bypass it.
  const admin = createAdminClient()
  const { error } = await admin
    .from('community_posts')
    .update({
      featured_at: input.featured ? new Date().toISOString() : null,
    })
    .eq('id', input.postId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/community')
  for (const s of COMMUNITY_SECTIONS) {
    if (s.postKinds && s.postKinds.length > 0) {
      revalidatePath(`/community/${s.slug}`)
    }
  }
  return { ok: true }
}

export async function setPostArchived(input: {
  postId: string
  archived: boolean
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser()
  if (user.role !== 'admin' && user.role !== 'facilitator') {
    return { ok: false, message: 'Only program staff can archive posts.' }
  }
  const admin = createAdminClient()
  const { error } = await admin
    .from('community_posts')
    .update({ is_archived: input.archived })
    .eq('id', input.postId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/community')
  for (const s of COMMUNITY_SECTIONS) {
    if (s.postKinds && s.postKinds.length > 0) {
      revalidatePath(`/community/${s.slug}`)
    }
  }
  return { ok: true }
}

/**
 * Update an Ask post's status (open / answered / closed). Owner can
 * call this to mark their own ask resolved; staff can also adjust.
 */
export async function setAskStatus(input: {
  postId: string
  status: 'open' | 'answered' | 'closed'
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('community_posts')
    .select('id, kind, created_by')
    .eq('id', input.postId)
    .maybeSingle<{ id: string; kind: string; created_by: string }>()

  if (!post) return { ok: false, message: 'Post not found.' }
  if (post.kind !== 'ask') {
    return { ok: false, message: 'This post is not an ask.' }
  }

  const isOwner = post.created_by === user.id
  const isStaff = user.role === 'admin' || user.role === 'facilitator'
  if (!isOwner && !isStaff) {
    return { ok: false, message: 'Only the asker or staff can update status.' }
  }

  const writer = isStaff && !isOwner ? createAdminClient() : supabase
  const { error } = await writer
    .from('community_posts')
    .update({ ask_status: input.status })
    .eq('id', input.postId)
  if (error) return { ok: false, message: error.message }
  revalidatePath('/community')
  revalidatePath('/community/ask')
  revalidatePath(`/community/stories/${input.postId}`)
  return { ok: true }
}

/**
 * Mark a single comment as the accepted answer for an ask. Setting
 * the comment id also flips the ask's status to 'answered' so the
 * lifecycle filter stays accurate. Pass `null` to clear.
 *
 * Only the post author or staff can mark/unmark the accepted answer.
 * The comment must belong to the post (subject_id match) - otherwise
 * we'd let any comment id be linked, which is a data-integrity bug
 * waiting to happen.
 */
export async function setAcceptedAnswer(input: {
  postId: string
  commentId: string | null
}): Promise<{ ok: boolean; message?: string }> {
  const user = await requireUser()
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('community_posts')
    .select('id, kind, created_by, ask_status')
    .eq('id', input.postId)
    .maybeSingle<{
      id: string
      kind: string
      created_by: string
      ask_status: string | null
    }>()

  if (!post) return { ok: false, message: 'Post not found.' }
  if (post.kind !== 'ask') {
    return { ok: false, message: 'This post is not an ask.' }
  }

  const isOwner = post.created_by === user.id
  const isStaff = user.role === 'admin' || user.role === 'facilitator'
  if (!isOwner && !isStaff) {
    return {
      ok: false,
      message: 'Only the asker or staff can mark an answer.',
    }
  }

  // Verify the comment is attached to this post (when we're setting
  // and not clearing). Closes the path where a malicious caller
  // links any comment id to any post.
  if (input.commentId) {
    const { data: comment } = await supabase
      .from('community_comments')
      .select('id, subject_type, subject_id, deleted_at')
      .eq('id', input.commentId)
      .maybeSingle<{
        id: string
        subject_type: string
        subject_id: string
        deleted_at: string | null
      }>()
    if (!comment) {
      return { ok: false, message: 'Comment not found.' }
    }
    if (
      comment.subject_type !== 'post' ||
      comment.subject_id !== input.postId
    ) {
      return {
        ok: false,
        message: 'That comment is not on this ask.',
      }
    }
    if (comment.deleted_at) {
      return {
        ok: false,
        message: 'That comment has been removed.',
      }
    }
  }

  // Setting an accepted answer flips status to 'answered' (unless
  // it was already 'closed'); clearing it returns the ask to 'open'.
  const nextStatus = input.commentId
    ? post.ask_status === 'closed'
      ? 'closed'
      : 'answered'
    : 'open'

  const writer = isStaff && !isOwner ? createAdminClient() : supabase
  const { error } = await writer
    .from('community_posts')
    .update({
      accepted_answer_comment_id: input.commentId,
      ask_status: nextStatus,
    })
    .eq('id', input.postId)
  if (error) return { ok: false, message: error.message }

  revalidatePath('/community')
  revalidatePath('/community/ask')
  revalidatePath(`/community/stories/${input.postId}`)
  return { ok: true }
}
