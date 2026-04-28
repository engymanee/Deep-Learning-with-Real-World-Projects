'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { COHORTS } from '@/lib/cohorts'
import {
  isContentCategory,
  isContentResourceType,
  type ContentCategory,
  type ContentResourceType,
} from '@/lib/content-types'

// ============================================================================
// Shared helpers
// ============================================================================

export type ActionResult =
  | { ok: true; message: string }
  | { ok: false; message: string }

function ok(message: string): ActionResult {
  return { ok: true, message }
}
function fail(message: string): ActionResult {
  return { ok: false, message }
}

function nullable(v: FormDataEntryValue | null): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s.length === 0 ? null : s
}

/**
 * Pull the cohort selections out of a form. The CohortAccessField
 * component submits one entry per ticked cohort using the same name
 * (default: "cohorts"). We coerce to strings, dedupe, and reject any
 * value that isn't one of A/B/C.
 */
function readCohorts(formData: FormData, name = 'cohorts'): string[] {
  const raw = formData.getAll(name)
  const allowed = new Set(COHORTS as readonly string[])
  const out = new Set<string>()
  for (const v of raw) {
    if (typeof v === 'string' && allowed.has(v)) out.add(v)
  }
  return Array.from(out)
}

/**
 * Resolve the cohort gating the admin chose for a content item.
 *
 *  - cohort_mode === 'inherit' -> null         (item inherits its phase)
 *  - cohort_mode === 'override' -> []|[A,B,C]  (item locks/overrides)
 *
 * Any other value falls back to inherit so a half-submitted form never
 * accidentally publishes content to no one.
 */
function readItemCohorts(formData: FormData): string[] | null {
  const mode = String(formData.get('cohort_mode') ?? 'inherit')
  if (mode === 'override') return readCohorts(formData)
  return null
}

// ============================================================================
// PHASES (table: years)
// ============================================================================

export async function createYear(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    const cohorts = readCohorts(formData)
    if (!title) return fail('Title is required')

    // Generate a URL-safe slug from the title, with a numeric suffix
    // when there's a collision so admins never have to think about ids.
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
    if (!slug) return fail('Title must contain letters or numbers')

    const supabase = await createClient()

    const { data: last } = await supabase
      .from('years')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (last?.order_index ?? 0) + 1

    let candidate = slug
    let suffix = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing } = await supabase
        .from('years')
        .select('id')
        .eq('id', candidate)
        .maybeSingle<{ id: string }>()
      if (!existing) break
      suffix += 1
      candidate = `${slug}-${suffix}`
    }

    const { error } = await supabase
      .from('years')
      .insert({ id: candidate, title, description, order_index: nextIndex, cohorts })
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase created')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateYear(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    const cohorts = readCohorts(formData)
    if (!id) return fail('Missing phase id')
    if (!title) return fail('Title is required')

    const supabase = await createClient()
    const { error } = await supabase
      .from('years')
      .update({ title, description, cohorts })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

/**
 * Delete a phase along with every content item underneath it. The
 * content items table is FK'd to years with ON DELETE CASCADE so the
 * single delete is enough.
 */
export async function deleteYear(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    if (!id) return fail('Missing phase id')

    const supabase = await createClient()
    const { error } = await supabase.from('years').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ============================================================================
// CONTENT ITEMS (table: labs)
// ============================================================================
//
// A content item is a single resource (reading, video, slide deck, etc.)
// that lives under a phase. Each item declares:
//
//   - category       : where it shows up (Before / During / After / etc.)
//   - resource_type  : how a fellow consumes it
//   - title          : short heading shown in the phase view
//   - description    : optional one-liner
//   - body           : optional rich text shown inline
//   - url            : optional external link / asset
//   - cohorts        : NULL = inherit phase | [] = locked | [A,B,C] = override

export async function createContentItem(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const year_id = String(formData.get('year_id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    const body = nullable(formData.get('body'))
    const url = nullable(formData.get('url'))
    const categoryRaw = String(formData.get('category') ?? '').trim()
    const resourceTypeRaw = String(formData.get('resource_type') ?? '').trim()

    if (!year_id) return fail('Phase is required')
    if (!title) return fail('Title is required')
    if (!isContentCategory(categoryRaw)) return fail('Pick a category')
    if (!isContentResourceType(resourceTypeRaw)) return fail('Pick a resource type')

    const category: ContentCategory = categoryRaw
    const resource_type: ContentResourceType = resourceTypeRaw
    const cohorts = readItemCohorts(formData)

    const supabase = await createClient()

    // Derive a URL-safe id from the title within the phase, suffixing on
    // collision. Keeps fellow URLs readable without forcing admins to
    // think about it.
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
    if (!baseSlug) return fail('Title must contain letters or numbers')

    let candidate = `${year_id}-${baseSlug}`.slice(0, 80)
    let suffix = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const { data: existing } = await supabase
        .from('labs')
        .select('id')
        .eq('id', candidate)
        .maybeSingle<{ id: string }>()
      if (!existing) break
      suffix += 1
      candidate = `${year_id}-${baseSlug}-${suffix}`.slice(0, 80)
    }

    // Place at the end of its phase (across all categories) so the unique
    // (year_id, order_index) constraint stays satisfied.
    const { data: last } = await supabase
      .from('labs')
      .select('order_index')
      .eq('year_id', year_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (last?.order_index ?? 0) + 1

    const { error } = await supabase.from('labs').insert({
      id: candidate,
      year_id,
      title,
      description,
      body,
      url,
      category,
      resource_type,
      cohorts,
      order_index: nextIndex,
    })
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    revalidatePath(`/phases/${year_id}`)
    return ok('Content added')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateContentItem(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const year_id = String(formData.get('year_id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    const body = nullable(formData.get('body'))
    const url = nullable(formData.get('url'))
    const categoryRaw = String(formData.get('category') ?? '').trim()
    const resourceTypeRaw = String(formData.get('resource_type') ?? '').trim()

    if (!id) return fail('Missing content id')
    if (!title) return fail('Title is required')
    if (!isContentCategory(categoryRaw)) return fail('Pick a category')
    if (!isContentResourceType(resourceTypeRaw)) return fail('Pick a resource type')

    const cohorts = readItemCohorts(formData)

    const supabase = await createClient()
    const { error } = await supabase
      .from('labs')
      .update({
        title,
        description,
        body,
        url,
        category: categoryRaw,
        resource_type: resourceTypeRaw,
        cohorts,
      })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    if (year_id) revalidatePath(`/phases/${year_id}`)
    return ok('Content updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteContentItem(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const year_id = String(formData.get('year_id') ?? '').trim()
    if (!id) return fail('Missing content id')

    const supabase = await createClient()
    const { error } = await supabase.from('labs').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    if (year_id) revalidatePath(`/phases/${year_id}`)
    return ok('Content deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}
