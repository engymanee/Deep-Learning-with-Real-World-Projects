import 'server-only'

import { createClient } from '@/lib/supabase/server'

/**
 * Wire shape returned by `loadReflectionFeed`. Each row is one
 * reflection entry from `user_content_reflections`, enriched with
 * the prompt + lab title (joined from `labs`) and the author profile.
 */
export interface ReflectionFeedItem {
  /** Stable UUID added in migration 050. */
  id: string
  /** Markdown body the fellow wrote. */
  body: string
  /** Free-form `visibility`: 'public' | 'cohort' | 'private'. */
  visibility: 'public' | 'cohort' | 'private'
  created_at: string
  updated_at: string | null
  /** Lab the reflection was attached to. May be missing if the
   *  upstream content row was deleted. */
  content: {
    id: string
    title: string | null
    /** Phase / module breadcrumb piece. Free-text "year" id. */
    year_id: string | null
    /** Reflection prompt the fellow saw when writing. */
    prompt: string | null
  } | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  /** Number of non-deleted comments attached to this reflection. */
  comment_count: number
}

interface RawReflectionRow {
  id: string
  body: string
  visibility: 'public' | 'cohort' | 'private'
  created_at: string
  updated_at: string | null
  content: {
    id: string
    title: string | null
    year_id: string | null
    reflection_prompt: string | null
  } | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/**
 * Load the public/cohort reflections feed.
 *
 * Two queries:
 *   1. Pull the top N reflections + lab + author in one round trip.
 *   2. Aggregate per-reflection comment counts in a single grouped
 *      query, then fold back into the rows.
 *
 * We deliberately keep `private` reflections out of the feed at the
 * query level (RLS would also enforce that, but filtering early
 * keeps the query payload small).
 */
export async function loadReflectionFeed(options?: {
  /** Limit how many reflections come back. Defaults to 50. */
  limit?: number
}): Promise<ReflectionFeedItem[]> {
  const supabase = await createClient()
  const limit = Math.max(1, Math.min(options?.limit ?? 50, 200))

  const { data: raw, error } = await supabase
    .from('user_content_reflections')
    .select(
      `
      id, body, visibility, created_at, updated_at,
      content:content_id ( id, title, year_id, reflection_prompt ),
      author:profile_id ( id, full_name, email, avatar_url )
      `,
    )
    .neq('visibility', 'private')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<RawReflectionRow[]>()

  if (error || !raw) return []

  // Aggregate comment counts per reflection. We use a single SELECT
  // with subject filter; Postgres groups + counts in one pass.
  const ids = raw.map((r) => r.id)
  const counts = new Map<string, number>()

  if (ids.length > 0) {
    const { data: commentRows } = await supabase
      .from('community_comments')
      .select('subject_id')
      .eq('subject_type', 'reflection')
      .is('deleted_at', null)
      .in('subject_id', ids)
      .returns<{ subject_id: string }[]>()

    for (const row of commentRows ?? []) {
      counts.set(row.subject_id, (counts.get(row.subject_id) ?? 0) + 1)
    }
  }

  return raw.map((r) => ({
    id: r.id,
    body: r.body,
    visibility: r.visibility,
    created_at: r.created_at,
    updated_at: r.updated_at,
    content: r.content
      ? {
          id: r.content.id,
          title: r.content.title,
          year_id: r.content.year_id,
          prompt: r.content.reflection_prompt,
        }
      : null,
    author: r.author,
    comment_count: counts.get(r.id) ?? 0,
  }))
}

/** Wire shape returned by loadComments(). */
export interface CommentItem {
  id: string
  body: string
  created_at: string
  updated_at: string | null
  parent_comment_id: string | null
  is_deleted: boolean
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface RawCommentRow {
  id: string
  body: string
  created_at: string
  updated_at: string | null
  parent_comment_id: string | null
  deleted_at: string | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/**
 * Fetch the (non-deleted) comments for a single subject (a post or
 * a reflection). Soft-deleted comments are kept in the result list
 * so the UI can show "removed" placeholders that preserve thread
 * structure, but their body is blanked.
 */
export async function loadComments(
  subjectType: 'post' | 'reflection',
  subjectId: string,
): Promise<CommentItem[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('community_comments')
    .select(
      `
      id, body, created_at, updated_at, parent_comment_id, deleted_at,
      author:profile_id ( id, full_name, email, avatar_url )
      `,
    )
    .eq('subject_type', subjectType)
    .eq('subject_id', subjectId)
    .order('created_at', { ascending: true })
    .returns<RawCommentRow[]>()

  if (error || !data) return []

  return data.map((c) => ({
    id: c.id,
    body: c.deleted_at ? '' : c.body,
    created_at: c.created_at,
    updated_at: c.updated_at,
    parent_comment_id: c.parent_comment_id,
    is_deleted: c.deleted_at !== null,
    author: c.author,
  }))
}
