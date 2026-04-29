'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
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
