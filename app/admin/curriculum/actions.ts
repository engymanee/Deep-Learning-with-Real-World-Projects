'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

// ============================================================================
// Types
// ============================================================================

export type Phase = 'before' | 'during' | 'after'

export type BlockType =
  | 'reading'
  | 'video'
  | 'reflection_prompt'
  | 'protocol'
  | 'session_link'
  | 'slides'
  | 'survey'
  | 'follow_up_task'

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }

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

function nullableInt(v: FormDataEntryValue | null): number | null {
  const n = Number(typeof v === 'string' ? v : '')
  return Number.isFinite(n) && n >= 0 ? n : null
}

const PHASES: readonly Phase[] = ['before', 'during', 'after'] as const
const BLOCK_TYPES: readonly BlockType[] = [
  'reading',
  'video',
  'reflection_prompt',
  'protocol',
  'session_link',
  'slides',
  'survey',
  'follow_up_task',
] as const

function assertPhase(v: unknown): asserts v is Phase {
  if (!PHASES.includes(v as Phase)) throw new Error(`Invalid phase: ${String(v)}`)
}
function assertBlockType(v: unknown): asserts v is BlockType {
  if (!BLOCK_TYPES.includes(v as BlockType)) throw new Error(`Invalid block type: ${String(v)}`)
}

// ============================================================================
// YEARS  (fixed 3, admins can only edit title + description)
// ============================================================================

export async function updateYear(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    if (!id) return fail('Missing year id')
    if (!title) return fail('Title is required')

    const supabase = await createClient()
    const { error } = await supabase
      .from('years')
      .update({ title, description })
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
 * Admins can create brand-new curriculum labels (a Year row) from the
 * sidebar. Slug is derived from the title so fellows don't have to think
 * about DB ids. Placed at the end of the curriculum list.
 */
export async function createYear(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    if (!title) return fail('Title is required')

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40)
    if (!slug) return fail('Title must contain letters or numbers')

    const supabase = await createClient()

    // Place at the end.
    const { data: last } = await supabase
      .from('years')
      .select('order_index')
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (last?.order_index ?? 0) + 1

    // Resolve any slug collision ("deep-learning", "deep-learning-2", ...).
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
      .insert({ id: candidate, title, description, order_index: nextIndex })
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Phase created')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ============================================================================
// LABS
// ============================================================================

export async function createLab(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const year_id = String(formData.get('year_id') ?? '').trim()
    const id = String(formData.get('id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    if (!year_id) return fail('Year is required')
    if (!id) return fail('Lab id (slug) is required')
    if (!title) return fail('Title is required')

    const supabase = await createClient()

    // Place it at the end of the year.
    const { data: last } = await supabase
      .from('labs')
      .select('order_index')
      .eq('year_id', year_id)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (last?.order_index ?? 0) + 1

    const { error } = await supabase
      .from('labs')
      .insert({ id, year_id, title, description, order_index: nextIndex })
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    return ok('Item created')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateLab(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const description = nullable(formData.get('description'))
    if (!id) return fail('Missing lab id')
    if (!title) return fail('Title is required')

    const supabase = await createClient()
    const { error } = await supabase
      .from('labs')
      .update({ title, description })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    revalidatePath(`/admin/curriculum/labs/${id}`)
    revalidatePath(`/labs/${id}`)
    return ok('Item updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteLab(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    if (!id) return fail('Missing lab id')

    const supabase = await createClient()
    const { error } = await supabase.from('labs').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath('/admin/curriculum')
    return ok('Item deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

/**
 * Persist a full drag-and-drop reordering. The client sends one entry per
 * phase whose contents changed, each with the canonical ordered list of
 * item ids. We write in two passes to side-step the UNIQUE
 * (year_id, order_index) constraint: first park every affected row on a
 * unique negative index (also moving it to its new phase), then assign
 * its final positive index. Any id that came in but doesn't exist in the
 * DB is silently ignored so stale client state never 500s the request.
 */
export async function reorderLabs(
  orderings: { year_id: string; lab_ids: string[] }[],
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!Array.isArray(orderings) || orderings.length === 0) {
      return ok('Nothing to save')
    }

    const supabase = await createClient()
    let temp = -1

    // Pass 1 - stash every row on a temporary negative index so we can freely
    // rewrite the destination phase's final indexes without colliding.
    for (const o of orderings) {
      if (!o?.year_id || !Array.isArray(o.lab_ids)) continue
      for (const labId of o.lab_ids) {
        const { error } = await supabase
          .from('labs')
          .update({ year_id: o.year_id, order_index: temp })
          .eq('id', labId)
        if (error) return fail(error.message)
        temp -= 1
      }
    }

    // Pass 2 - apply the final 1..N ordering per phase.
    for (const o of orderings) {
      if (!o?.year_id || !Array.isArray(o.lab_ids)) continue
      for (let i = 0; i < o.lab_ids.length; i++) {
        const { error } = await supabase
          .from('labs')
          .update({ order_index: i + 1 })
          .eq('id', o.lab_ids[i])
        if (error) return fail(error.message)
      }
    }

    revalidatePath('/admin/curriculum')
    revalidatePath('/dashboard')
    return ok('Order saved')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function moveLab(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const direction = String(formData.get('direction') ?? '').trim()
    if (!id) return fail('Missing lab id')
    if (direction !== 'up' && direction !== 'down') return fail('Bad direction')

    const supabase = await createClient()

    const { data: me } = await supabase
      .from('labs')
      .select('id, year_id, order_index')
      .eq('id', id)
      .maybeSingle<{ id: string; year_id: string; order_index: number }>()
    if (!me) return fail('Lab not found')

    const { data: neighbor } = await supabase
      .from('labs')
      .select('id, order_index')
      .eq('year_id', me.year_id)
      .order('order_index', { ascending: direction === 'down' })
      .gt(direction === 'down' ? 'order_index' : 'id', direction === 'down' ? me.order_index : '')
      .limit(1)

    // Simpler: fetch all labs in the year, swap with adjacent.
    const { data: siblings } = await supabase
      .from('labs')
      .select('id, order_index')
      .eq('year_id', me.year_id)
      .order('order_index', { ascending: true })

    if (!siblings || siblings.length < 2) return ok('Nothing to reorder')

    const idx = siblings.findIndex((s) => s.id === id)
    if (idx === -1) return fail('Lab not found in year')
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return ok('Already at edge')

    const a = siblings[idx]
    const b = siblings[swapIdx]

    // Swap via a temp value to avoid unique-index collisions.
    const tempIndex = -Math.abs(a.order_index + b.order_index) - 1
    await supabase.from('labs').update({ order_index: tempIndex }).eq('id', a.id)
    await supabase.from('labs').update({ order_index: a.order_index }).eq('id', b.id)
    const { error: e3 } = await supabase
      .from('labs')
      .update({ order_index: b.order_index })
      .eq('id', a.id)
    if (e3) return fail(e3.message)

    // Silence the unused-neighbor lookup (kept for future use).
    void neighbor

    revalidatePath('/admin/curriculum')
    return ok('Lab reordered')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

// ============================================================================
// BLOCKS
// ============================================================================

export async function createBlock(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const lab_id = String(formData.get('lab_id') ?? '').trim()
    const phase = String(formData.get('phase') ?? '').trim()
    const block_type = String(formData.get('block_type') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const body = nullable(formData.get('body'))
    const url = nullable(formData.get('url'))
    const duration_minutes = nullableInt(formData.get('duration_minutes'))
    const is_optional = String(formData.get('is_optional') ?? '') === 'true'
    const session_id = nullable(formData.get('session_id'))

    if (!lab_id) return fail('Missing lab id')
    assertPhase(phase)
    assertBlockType(block_type)
    if (!title) return fail('Title is required')

    const supabase = await createClient()

    // Place at end of its phase.
    const { data: last } = await supabase
      .from('lab_content_blocks')
      .select('order_index')
      .eq('lab_id', lab_id)
      .eq('phase', phase)
      .order('order_index', { ascending: false })
      .limit(1)
      .maybeSingle<{ order_index: number }>()
    const nextIndex = (last?.order_index ?? 0) + 1

    const { error } = await supabase.from('lab_content_blocks').insert({
      lab_id,
      phase,
      block_type,
      order_index: nextIndex,
      title,
      body,
      url,
      duration_minutes,
      is_optional,
      session_id,
    })
    if (error) return fail(error.message)

    revalidatePath(`/admin/curriculum/labs/${lab_id}`)
    revalidatePath(`/labs/${lab_id}`)
    return ok('Block added')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function updateBlock(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const lab_id = String(formData.get('lab_id') ?? '').trim()
    const phase = String(formData.get('phase') ?? '').trim()
    const block_type = String(formData.get('block_type') ?? '').trim()
    const title = String(formData.get('title') ?? '').trim()
    const body = nullable(formData.get('body'))
    const url = nullable(formData.get('url'))
    const duration_minutes = nullableInt(formData.get('duration_minutes'))
    const is_optional = String(formData.get('is_optional') ?? '') === 'true'
    const session_id = nullable(formData.get('session_id'))

    if (!id) return fail('Missing block id')
    if (!lab_id) return fail('Missing lab id')
    assertPhase(phase)
    assertBlockType(block_type)
    if (!title) return fail('Title is required')

    const supabase = await createClient()
    const { error } = await supabase
      .from('lab_content_blocks')
      .update({
        phase,
        block_type,
        title,
        body,
        url,
        duration_minutes,
        is_optional,
        session_id,
      })
      .eq('id', id)
    if (error) return fail(error.message)

    revalidatePath(`/admin/curriculum/labs/${lab_id}`)
    revalidatePath(`/labs/${lab_id}`)
    return ok('Block updated')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function deleteBlock(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const lab_id = String(formData.get('lab_id') ?? '').trim()
    if (!id) return fail('Missing block id')

    const supabase = await createClient()
    const { error } = await supabase.from('lab_content_blocks').delete().eq('id', id)
    if (error) return fail(error.message)

    revalidatePath(`/admin/curriculum/labs/${lab_id}`)
    revalidatePath(`/labs/${lab_id}`)
    return ok('Block deleted')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}

export async function moveBlock(formData: FormData): Promise<ActionResult> {
  try {
    await requireAdmin()
    const id = String(formData.get('id') ?? '').trim()
    const lab_id = String(formData.get('lab_id') ?? '').trim()
    const direction = String(formData.get('direction') ?? '').trim()
    if (!id || !lab_id) return fail('Missing ids')
    if (direction !== 'up' && direction !== 'down') return fail('Bad direction')

    const supabase = await createClient()

    const { data: me } = await supabase
      .from('lab_content_blocks')
      .select('id, lab_id, phase, order_index')
      .eq('id', id)
      .maybeSingle<{ id: string; lab_id: string; phase: Phase; order_index: number }>()
    if (!me) return fail('Block not found')

    const { data: siblings } = await supabase
      .from('lab_content_blocks')
      .select('id, order_index')
      .eq('lab_id', me.lab_id)
      .eq('phase', me.phase)
      .order('order_index', { ascending: true })

    if (!siblings || siblings.length < 2) return ok('Nothing to reorder')

    const idx = siblings.findIndex((s) => s.id === id)
    if (idx === -1) return fail('Block not found in phase')
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return ok('Already at edge')

    const a = siblings[idx]
    const b = siblings[swapIdx]

    const tempIndex = -Math.abs(a.order_index + b.order_index) - 1
    await supabase.from('lab_content_blocks').update({ order_index: tempIndex }).eq('id', a.id)
    await supabase.from('lab_content_blocks').update({ order_index: a.order_index }).eq('id', b.id)
    const { error: e3 } = await supabase
      .from('lab_content_blocks')
      .update({ order_index: b.order_index })
      .eq('id', a.id)
    if (e3) return fail(e3.message)

    revalidatePath(`/admin/curriculum/labs/${lab_id}`)
    revalidatePath(`/labs/${lab_id}`)
    return ok('Block reordered')
  } catch (e) {
    return fail(e instanceof Error ? e.message : 'Unknown error')
  }
}
