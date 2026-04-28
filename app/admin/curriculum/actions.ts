'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { COHORTS } from '@/lib/cohorts'
import {
  CONTENT_CATEGORY_VALUES,
  RESOURCE_TYPE_VALUES,
  isContentCategory,
  isResourceType,
  type ContentCategory,
  type ResourceType,
} from '@/lib/curriculum'

// ============================================================================
// Helpers
// ============================================================================

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

const ok = (message: string): ActionResult => ({ ok: true, message })
const fail = (message: string): ActionResult => ({ ok: false, message })

const trim = (v: FormDataEntryValue | null) =>
  typeof v === 'string' ? v.trim() : ''

const nullable = (v: FormDataEntryValue | null) => {
  const s = trim(v)
  return s.length === 0 ? null : s
}

/**
 * Read the cohort selections for a phase from a form. The CohortAccessField
 * component submits one entry per ticked cohort, so an empty array means
 * "no cohorts assigned" (= hidden from every fellow).
 */
function readPhaseCohorts(formData: FormData, name = 'cohorts'): string[] {
  const raw = formData.getAll(name)
  const allowed = new Set(COHORTS as readonly string[])
  const out = new Set<string>()
  for (const v of raw) if (typeof v === 'string' && allowed.has(v)) out.add(v)
  return Array.from(out)
}

/**
 * Read cohort access for a content item, honoring the `inherit` flag.
 *
 *   inherit=on        -> NULL (item inherits its phase's cohorts)
 *   inherit absent    -> array of ticked cohorts (may be empty = locked)
 */
function readContentCohorts(formData: FormData): string[] | null {
  if (trim(formData.get('cohorts_inherit')) === 'on') return null
  return readPhaseCohorts(formData)
}

// ============================================================================
// Phases (table: years)
// ============================================================================

export async function createPhase(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const title = trim(formData.get('title'))
    const description = nullable(formData.get('description'))
    const cohorts = readPhaseCohorts(formData)
    if (!title) return fail('Phase title is required')

    const supabase = await createClient()

    // Append at the end of the curriculum.
    const { data: maxRow } = await supabase
      .from('years')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (maxRow?.order_index ?? 0) + 1

    const { error } = await supabase
      .from('years')
      .insert({ title, description, cohorts, order_index: nextIndex })
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase created')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updatePhase(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = trim(formData.get('id'))
    const title = trim(formData.get('title'))
    const description = nullable(formData.get('description'))
    const cohorts = readPhaseCohorts(formData)
    if (!id) return fail('Missing phase id')
    if (!title) return fail('Phase title is required')

    const supabase = await createClient()
    const { error } = await supabase
      .from('years')
      .update({ title, description, cohorts })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath(`/admin/curriculum/${id}`)
    revalidatePath('/dashboard')
    revalidatePath(`/phases/${id}`)
    return ok('Phase updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deletePhase(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = trim(formData.get('id'))
    if (!id) return fail('Missing phase id')

    const supabase = await createClient()
    // Cascade is set on labs.year_id, so all content items go with the phase.
    const { error } = await supabase.from('years').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function reorderPhases(orderedIds: string[]): Promise<ActionResult> {
  try {
    await requireAdmin()
    const supabase = await createClient()

    // Pass 1: bump every affected row out of conflict range so the
    // unique (order_index) constraint can't bite when shuffling.
    await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('years')
          .update({ order_index: 1000 + i })
          .eq('id', id),
      ),
    )
    // Pass 2: write the final indices.
    const errors = await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('years')
          .update({ order_index: i + 1 })
          .eq('id', id)
          .then((r) => r.error),
      ),
    )
    const firstError = errors.find(Boolean)
    if (firstError) return fail(firstError.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phases reordered')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ============================================================================
// Content items (table: labs)
// ============================================================================

function assertCategory(v: string): asserts v is ContentCategory {
  if (!isContentCategory(v)) throw new Error(`Invalid category: ${v}`)
}
function assertResourceType(v: string): asserts v is ResourceType {
  if (!isResourceType(v)) throw new Error(`Invalid resource type: ${v}`)
}

interface ContentInputs {
  yearId: string
  category: ContentCategory
  resourceType: ResourceType
  title: string
  description: string | null
  body: string | null
  url: string | null
  cohorts: string[] | null
}

function readContentInputs(formData: FormData): ContentInputs | string {
  const yearId = trim(formData.get('year_id'))
  const category = trim(formData.get('category'))
  const resourceType = trim(formData.get('resource_type'))
  const title = trim(formData.get('title'))
  const description = nullable(formData.get('description'))
  const body = nullable(formData.get('body'))
  const url = nullable(formData.get('url'))
  const cohorts = readContentCohorts(formData)

  if (!yearId) return 'Missing phase id'
  if (!title) return 'Title is required'
  if (!category) return 'Pick a category'
  if (!resourceType) return 'Pick a resource type'
  try {
    assertCategory(category)
    assertResourceType(resourceType)
  } catch (e) {
    return e instanceof Error ? e.message : 'Invalid selection'
  }
  if (url && !/^https?:\/\//i.test(url)) {
    return 'URL must start with http:// or https://'
  }
  return {
    yearId,
    category: category as ContentCategory,
    resourceType: resourceType as ResourceType,
    title,
    description,
    body,
    url,
    cohorts,
  }
}

export async function createContent(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const parsed = readContentInputs(formData)
    if (typeof parsed === 'string') return fail(parsed)
    const supabase = await createClient()

    // Append within the (phase, category) bucket.
    const { data: maxRow } = await supabase
      .from('labs')
      .select('order_index')
      .eq('year_id', parsed.yearId)
      .eq('category', parsed.category)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (maxRow?.order_index ?? 0) + 1

    const { error } = await supabase.from('labs').insert({
      year_id: parsed.yearId,
      category: parsed.category,
      resource_type: parsed.resourceType,
      title: parsed.title,
      description: parsed.description,
      body: parsed.body,
      url: parsed.url,
      cohorts: parsed.cohorts,
      order_index: nextIndex,
    })
    if (error) return fail(error.message)

    revalidatePath(`/admin/curriculum/${parsed.yearId}`)
    revalidatePath('/admin/curriculum')
    revalidatePath(`/phases/${parsed.yearId}`)
    return ok('Content added')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateContent(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = trim(formData.get('id'))
    if (!id) return fail('Missing content id')
    const parsed = readContentInputs(formData)
    if (typeof parsed === 'string') return fail(parsed)

    const supabase = await createClient()
    const { error } = await supabase
      .from('labs')
      .update({
        category: parsed.category,
        resource_type: parsed.resourceType,
        title: parsed.title,
        description: parsed.description,
        body: parsed.body,
        url: parsed.url,
        cohorts: parsed.cohorts,
      })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath(`/admin/curriculum/${parsed.yearId}`)
    revalidatePath(`/phases/${parsed.yearId}`)
    revalidatePath(`/phases/${parsed.yearId}/items/${id}`)
    return ok('Content updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteContent(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = trim(formData.get('id'))
    const yearId = trim(formData.get('year_id'))
    if (!id) return fail('Missing content id')

    const supabase = await createClient()
    const { error } = await supabase.from('labs').delete().eq('id', id)
    if (error) return fail(error.message)

    if (yearId) {
      revalidatePath(`/admin/curriculum/${yearId}`)
      revalidatePath(`/phases/${yearId}`)
    }
    revalidatePath('/admin/curriculum')
    return ok('Content deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function reorderContent(
  yearId: string,
  category: ContentCategory,
  orderedIds: string[],
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!isContentCategory(category)) return fail('Invalid category')
    const supabase = await createClient()

    await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('labs')
          .update({ order_index: 10000 + i })
          .eq('id', id)
          .eq('year_id', yearId)
          .eq('category', category),
      ),
    )
    const errors = await Promise.all(
      orderedIds.map((id, i) =>
        supabase
          .from('labs')
          .update({ order_index: i + 1 })
          .eq('id', id)
          .eq('year_id', yearId)
          .eq('category', category)
          .then((r) => r.error),
      ),
    )
    const firstError = errors.find(Boolean)
    if (firstError) return fail(firstError.message)

    revalidatePath(`/admin/curriculum/${yearId}`)
    revalidatePath(`/phases/${yearId}`)
    return ok('Content reordered')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// Re-export so callers don't need a separate import.
export { CONTENT_CATEGORY_VALUES, RESOURCE_TYPE_VALUES }
