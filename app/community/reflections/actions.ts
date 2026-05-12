'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireUser } from '@/lib/auth-server'

const MAX_COMMENT_BODY = 4_000

export type ActionResult =
  | { ok: true }
  | { ok: false; message: string }

export type AddCommentResult =
  | { ok: true; commentId: string }
  | { ok: false; message: string }

/**
 * Shared guard for community comment + reflection actions:
 *   - Caller must be authenticated.
 *   - Preview impersonation cannot write data.
 *
 * Returns the user object on success, otherwise an error result that
 * the caller can propagate directly.
 */
async function authorizeOrFail(): Promise<
  | { ok: true; user: Awaited<ReturnType<typeof requireUser>> }
  | { ok: false; message: string }
> {
  try {
    const user = await requireUser()
    if (user.id === '__preview__') {
      return { ok: false, message: 'Cannot write while previewing.' }
    }
    return { ok: true, user }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Not authenticated.',
    }
  }
}

/** Where to revalidate after a write that touches a subject. */
function revalidateForSubject(subjectType: 'post' | 'reflection') {
  // The reflections feed lives at /community/reflections and the
  // overview shows recent activity, so bust both. Posts can show up
  // under any of the section feeds; we bust the umbrella to keep
  // things simple. Stories pages re-render too.
  revalidatePath('/community')
  if (subjectType === 'reflection') {
    revalidatePath('/community/reflections')
  } else {
    revalidatePath('/community/whats-new')
    revalidatePath('/community/wins')
    revalidatePath('/community/ask')
  }
}

/**
 * Add a comment to a post or reflection. Optionally a reply, when
 * `parentCommentId` is supplied. Validates body length and confirms
 * the parent exists when replying.
 */
export async function addComment(input: {
  subjectType: 'post' | 'reflection'
  subjectId: string
  body: string
  parentCommentId?: string | null
}): Promise<AddCommentResult> {
  const auth = await authorizeOrFail()
  if (!auth.ok) return auth

  const body = input.body.trim()
  if (!body) return { ok: false, message: 'Comments cannot be empty.' }
  if (body.length > MAX_COMMENT_BODY) {
    return { ok: false, message: 'Comment is too long.' }
  }

  const supabase = await createClient()

  // Sanity-check the parent: same subject, not deleted. Without this
  // a malicious client could thread a comment onto an arbitrary
  // subject's tree by passing a foreign parent id.
  if (input.parentCommentId) {
    const { data: parent } = await supabase
      .from('community_comments')
      .select('id, subject_type, subject_id, deleted_at')
      .eq('id', input.parentCommentId)
      .maybeSingle<{
        id: string
        subject_type: string
        subject_id: string
        deleted_at: string | null
      }>()

    if (
      !parent ||
      parent.subject_type !== input.subjectType ||
      parent.subject_id !== input.subjectId ||
      parent.deleted_at !== null
    ) {
      return { ok: false, message: 'Cannot reply to that comment.' }
    }
  }

  const { data, error } = await supabase
    .from('community_comments')
    .insert({
      subject_type: input.subjectType,
      subject_id: input.subjectId,
      profile_id: auth.user.id,
      parent_comment_id: input.parentCommentId ?? null,
      body,
    })
    .select('id')
    .single()

  if (error || !data) {
    return {
      ok: false,
      message: error?.message ?? 'Failed to add comment.',
    }
  }

  revalidateForSubject(input.subjectType)
  return { ok: true, commentId: data.id }
}

/**
 * Edit a comment body. Only the comment's author can edit. Bumps
 * `updated_at` so the UI can render an "edited" hint.
 */
export async function updateComment(input: {
  commentId: string
  body: string
}): Promise<ActionResult> {
  const auth = await authorizeOrFail()
  if (!auth.ok) return auth

  const body = input.body.trim()
  if (!body) return { ok: false, message: 'Comments cannot be empty.' }
  if (body.length > MAX_COMMENT_BODY) {
    return { ok: false, message: 'Comment is too long.' }
  }

  const supabase = await createClient()

  // Single-statement update: RLS enforces ownership, so we don't
  // need a separate read. We do read back the subject_type/id so
  // we know which feed to revalidate.
  const { data, error } = await supabase
    .from('community_comments')
    .update({ body, updated_at: new Date().toISOString() })
    .eq('id', input.commentId)
    .eq('profile_id', auth.user.id)
    .is('deleted_at', null)
    .select('subject_type')
    .maybeSingle<{ subject_type: 'post' | 'reflection' }>()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: 'Comment not found.' }

  revalidateForSubject(data.subject_type)
  return { ok: true }
}

/**
 * Soft-delete a comment. Authors and admins can delete; we rely on
 * RLS for authors and explicitly allow the admin role here.
 */
export async function deleteComment(input: {
  commentId: string
}): Promise<ActionResult> {
  const auth = await authorizeOrFail()
  if (!auth.ok) return auth

  const supabase = await createClient()

  // Read the comment first so we can authorize admins (RLS only
  // allows the owner to delete, and `is_admin` lives outside the
  // table policy).
  const { data: existing, error: readErr } = await supabase
    .from('community_comments')
    .select('id, profile_id, subject_type')
    .eq('id', input.commentId)
    .maybeSingle<{
      id: string
      profile_id: string
      subject_type: 'post' | 'reflection'
    }>()

  if (readErr) return { ok: false, message: readErr.message }
  if (!existing) return { ok: false, message: 'Comment not found.' }

  const isOwner = existing.profile_id === auth.user.id
  const isAdmin = auth.user.role === 'admin'
  if (!isOwner && !isAdmin) {
    return { ok: false, message: 'You can only delete your own comments.' }
  }

  // RLS only lets the row owner update; admins need the service-role
  // client to bypass it. Owners use the regular session client so
  // their action stays auditable through Supabase's RLS logs.
  const writer = isAdmin && !isOwner ? createAdminClient() : supabase
  const { error } = await writer
    .from('community_comments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', input.commentId)

  if (error) return { ok: false, message: error.message }

  revalidateForSubject(existing.subject_type)
  return { ok: true }
}

/**
 * Update the visibility of a reflection. Only the reflection's
 * author can change it; admins use a different surface.
 */
export async function setReflectionVisibility(input: {
  reflectionId: string
  visibility: 'public' | 'cohort' | 'private'
}): Promise<ActionResult> {
  const auth = await authorizeOrFail()
  if (!auth.ok) return auth

  if (!['public', 'cohort', 'private'].includes(input.visibility)) {
    return { ok: false, message: 'Invalid visibility.' }
  }

  const supabase = await createClient()

  const { error, data } = await supabase
    .from('user_content_reflections')
    .update({ visibility: input.visibility })
    .eq('id', input.reflectionId)
    .eq('profile_id', auth.user.id)
    .select('id')
    .maybeSingle()

  if (error) return { ok: false, message: error.message }
  if (!data) return { ok: false, message: 'Reflection not found.' }

  revalidatePath('/community/reflections')
  revalidatePath('/community')
  return { ok: true }
}
