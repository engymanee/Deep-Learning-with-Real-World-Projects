'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'

/**
 * Result envelope used by every Library mutation. Returning a plain
 * object (instead of throwing) lets the client form surface the
 * error inline without crashing the page.
 */
export type LibraryActionResult =
  | { ok: true }
  | { ok: false; message: string }

/** Allowed values must mirror the CHECK constraint on the column. */
const VALID_TYPES = new Set(['document', 'video', 'link', 'reading'])

const MAX_TITLE_LEN = 200
const MAX_DESC_LEN = 1_000
const MAX_TAGS = 8
const MAX_TAG_LEN = 32

/**
 * Add a resource to the shared Library. Admin / facilitator only.
 *
 * Cohort visibility:
 *  - The form sends 'all' (default) or a specific cohort label.
 *  - Persisted as text[]: 'all' -> ['A','B'], otherwise [label].
 *  - The cohorts column on community_resources is NOT NULL, so we
 *    always emit a non-empty array.
 *
 * URL-only for the first cut. File upload via Vercel Blob is the
 * natural follow-up; when wired, it'll PUT the blob and pass the
 * resulting URL into this action - no schema changes required.
 */
export async function addLibraryResource(
  input: {
    title: string
    description?: string | null
    url: string
    resourceType: string
    tags?: string[]
    cohort?: 'all' | 'A' | 'B'
  },
): Promise<LibraryActionResult> {
  try {
    const user = await requireUser()
    if (user.role !== 'admin' && user.role !== 'facilitator') {
      return { ok: false, message: 'You do not have permission to add resources.' }
    }

    const title = (input.title ?? '').trim()
    const description = (input.description ?? '').trim() || null
    const url = (input.url ?? '').trim()
    const resourceType = (input.resourceType ?? '').trim()

    if (!title) return { ok: false, message: 'Title is required.' }
    if (title.length > MAX_TITLE_LEN) {
      return { ok: false, message: `Title must be ${MAX_TITLE_LEN} characters or fewer.` }
    }
    if (description && description.length > MAX_DESC_LEN) {
      return { ok: false, message: `Description must be ${MAX_DESC_LEN} characters or fewer.` }
    }
    if (!url) return { ok: false, message: 'URL is required.' }
    // Lightweight URL sanity check. We don't require http/https here
    // because facilitators may legitimately link to internal LMS
    // schemes - but we do reject obvious garbage.
    try {
      new URL(url)
    } catch {
      return { ok: false, message: 'URL must be a valid web address.' }
    }
    if (!VALID_TYPES.has(resourceType)) {
      return { ok: false, message: 'Resource type is invalid.' }
    }

    // Tag hygiene: trim, dedupe (case-insensitive), drop empties,
    // cap length and count. Stored verbatim (no lowercasing) so the
    // facilitator's casing is preserved on display.
    const seen = new Set<string>()
    const tags: string[] = []
    for (const raw of input.tags ?? []) {
      const t = (raw ?? '').trim()
      if (!t) continue
      if (t.length > MAX_TAG_LEN) {
        return { ok: false, message: `Tag "${t.slice(0, 16)}..." is too long.` }
      }
      const key = t.toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      tags.push(t)
      if (tags.length >= MAX_TAGS) break
    }

    const cohort = input.cohort ?? 'all'
    const cohorts: string[] =
      cohort === 'A' ? ['A'] : cohort === 'B' ? ['B'] : ['A', 'B']

    const supabase = await createClient()
    const { error } = await supabase.from('community_resources').insert({
      title,
      description,
      url,
      resource_type: resourceType,
      tags,
      cohorts,
    })
    if (error) return { ok: false, message: error.message }

    revalidatePath('/resources')
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}
