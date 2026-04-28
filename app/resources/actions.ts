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
/** Canonical cohort labels accepted by the visibility multi-select. */
const VALID_COHORTS = new Set(['A', 'B', 'C'])

const MAX_TITLE_LEN = 200
const MAX_DESC_LEN = 1_000
const MAX_TAGS = 8
const MAX_TAG_LEN = 32

/**
 * Add a resource to the shared Library. Admin / facilitator only.
 *
 * Visibility model:
 *  - `isUniversal=true` -> rendered on the "Further Reading" tab,
 *    visible to every authenticated user. Cohort labels are still
 *    accepted on the wire (for future filtering), but stored as the
 *    full A/B/C set so RLS / non-cumulative consumers don't accidentally
 *    hide the row.
 *  - `isUniversal=false` -> "My Resources" tab, cohort-gated using
 *    the cumulative-access rule (`cohortReleasedFor`).
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
    isUniversal?: boolean
    cohorts?: string[]
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

    const isUniversal = input.isUniversal === true

    // Cohort assignment: universal rows always store the full A/B/C
    // set so any consumer that bypasses the `is_universal` flag (e.g.
    // RLS policies) still allows them through. Cohort-gated rows
    // require at least one valid label; we dedupe and clamp to the
    // canonical A/B/C set.
    let cohorts: string[]
    if (isUniversal) {
      cohorts = ['A', 'B', 'C']
    } else {
      const seenC = new Set<string>()
      const cleaned: string[] = []
      for (const raw of input.cohorts ?? []) {
        const label = (raw ?? '').trim().toUpperCase()
        if (!VALID_COHORTS.has(label)) continue
        if (seenC.has(label)) continue
        seenC.add(label)
        cleaned.push(label)
      }
      if (cleaned.length === 0) {
        return {
          ok: false,
          message: 'Select at least one cohort or mark this as Further Reading.',
        }
      }
      cohorts = cleaned
    }

    const supabase = await createClient()
    const { error } = await supabase.from('community_resources').insert({
      title,
      description,
      url,
      resource_type: resourceType,
      tags,
      cohorts,
      is_universal: isUniversal,
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
