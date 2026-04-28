'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
} from '@/lib/curriculum'

// ----------------------------------------------------------------------------
// Visibility helper
// ----------------------------------------------------------------------------

interface ItemWithCascade {
  id: string
  year_id: string
  module_id: string | null
  url: string | null
  reflection_enabled: boolean
  cohorts: string[] | null
  modules: { cohorts: string[] | null } | null
  years: { cohorts: string[] | null } | null
}

/**
 * Look up the content row plus its parent module and phase cohort
 * lists in a single round-trip. Returns the row, or `null` plus an
 * error message when the row is missing or the user can't see it.
 *
 * Centralising this check keeps every fellow-side action enforcing
 * the exact same Phase -> Module -> Content cascade.
 */
async function loadVisibleItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contentId: string,
  user: Awaited<ReturnType<typeof requireUser>>,
): Promise<
  | { ok: true; item: ItemWithCascade }
  | { ok: false; message: string }
> {
  const { data: item, error } = await supabase
    .from('labs')
    .select(
      'id, year_id, module_id, url, reflection_enabled, cohorts, modules:module_id (cohorts), years:year_id (cohorts)',
    )
    .eq('id', contentId)
    .maybeSingle<ItemWithCascade>()

  if (error) return { ok: false, message: error.message }
  if (!item || !item.module_id) {
    return { ok: false, message: 'Content not found' }
  }
  if (user.role === 'fellow') {
    const userCohort = user.cohort ?? null
    const phaseCohorts = item.years?.cohorts ?? null
    const moduleCohorts = item.modules?.cohorts ?? null
    if (
      !canFellowSeePhase(phaseCohorts, userCohort) ||
      !canFellowSeeModule(moduleCohorts, phaseCohorts, userCohort) ||
      !canFellowSeeContent(item.cohorts, phaseCohorts, userCohort, moduleCohorts)
    ) {
      return { ok: false, message: 'Not allowed' }
    }
  }
  return { ok: true, item }
}

// ----------------------------------------------------------------------------
// Mark complete / not-complete
// ----------------------------------------------------------------------------

export type ToggleResult =
  | { ok: true; completed: boolean }
  | { ok: false; message: string }

/**
 * Toggle the current user's completion of a content item.
 *
 * Going from incomplete -> complete enforces the per-item gates the
 * admin configured:
 *
 *   - If the item has a URL, the fellow must have opened it (a row
 *     in `user_content_link_clicks`).
 *   - If `reflection_enabled` is true, the fellow must have submitted
 *     a reflection (a row in `user_content_reflections`).
 *
 * Going the other direction (uncheck) always works.
 */
export async function toggleContentCompletion(
  contentId: string,
  nextCompleted: boolean,
): Promise<ToggleResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()
    if (!contentId) return { ok: false, message: 'Missing content id' }

    const visible = await loadVisibleItem(supabase, contentId, user)
    if (!visible.ok) return { ok: false, message: visible.message }
    const { item } = visible

    if (nextCompleted) {
      // Gate 1: link click (if there's a link to click).
      if (item.url) {
        const { data: clickRow } = await supabase
          .from('user_content_link_clicks')
          .select('content_id')
          .eq('profile_id', user.id)
          .eq('content_id', contentId)
          .maybeSingle<{ content_id: string }>()
        if (!clickRow) {
          return {
            ok: false,
            message: 'Open the linked resource before marking complete.',
          }
        }
      }
      // Gate 2: reflection submitted (if required).
      if (item.reflection_enabled) {
        const { data: reflectionRow } = await supabase
          .from('user_content_reflections')
          .select('content_id')
          .eq('profile_id', user.id)
          .eq('content_id', contentId)
          .maybeSingle<{ content_id: string }>()
        if (!reflectionRow) {
          return {
            ok: false,
            message: 'Submit your reflection before marking complete.',
          }
        }
      }

      const { error: insertError } = await supabase
        .from('user_content_completions')
        .upsert(
          { profile_id: user.id, content_id: contentId },
          { onConflict: 'profile_id,content_id' },
        )
      if (insertError) return { ok: false, message: insertError.message }
    } else {
      const { error: deleteError } = await supabase
        .from('user_content_completions')
        .delete()
        .eq('profile_id', user.id)
        .eq('content_id', contentId)
      if (deleteError) return { ok: false, message: deleteError.message }
    }

    revalidatePath('/dashboard')
    revalidatePath(
      `/phases/${item.year_id}/modules/${item.module_id}/items/${contentId}`,
    )
    return { ok: true, completed: nextCompleted }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

// ----------------------------------------------------------------------------
// Track that the fellow opened the linked resource
// ----------------------------------------------------------------------------

export type LinkClickResult =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Record that the current user clicked the external link for a
 * content item. Idempotent - calling twice is a no-op. Fired by the
 * `LinkOpenButton` client component on the viewer page.
 */
export async function recordLinkClick(
  contentId: string,
): Promise<LinkClickResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()
    if (!contentId) return { ok: false, message: 'Missing content id' }

    const visible = await loadVisibleItem(supabase, contentId, user)
    if (!visible.ok) return { ok: false, message: visible.message }
    const { item } = visible

    if (!item.url) {
      // Nothing to track. Treat as success so the client can no-op.
      return { ok: true }
    }

    const { error } = await supabase
      .from('user_content_link_clicks')
      .upsert(
        { profile_id: user.id, content_id: contentId },
        { onConflict: 'profile_id,content_id' },
      )
    if (error) return { ok: false, message: error.message }

    revalidatePath(
      `/phases/${item.year_id}/modules/${item.module_id}/items/${contentId}`,
    )
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

// ----------------------------------------------------------------------------
// Submit / update the fellow's reflection
// ----------------------------------------------------------------------------

export type ReflectionResult =
  | { ok: true }
  | { ok: false; message: string }

const MAX_REFLECTION_LENGTH = 5000

/**
 * Save (or update) the current user's reflection for a content item.
 * Only valid when the item has `reflection_enabled = true`.
 */
export async function submitReflection(
  contentId: string,
  response: string,
): Promise<ReflectionResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()
    if (!contentId) return { ok: false, message: 'Missing content id' }

    const trimmed = response.trim()
    if (!trimmed) return { ok: false, message: 'Reflection cannot be empty' }
    if (trimmed.length > MAX_REFLECTION_LENGTH) {
      return {
        ok: false,
        message: `Reflection is too long (max ${MAX_REFLECTION_LENGTH} characters)`,
      }
    }

    const visible = await loadVisibleItem(supabase, contentId, user)
    if (!visible.ok) return { ok: false, message: visible.message }
    const { item } = visible

    if (!item.reflection_enabled) {
      return {
        ok: false,
        message: 'This content does not require a reflection.',
      }
    }

    const { error } = await supabase
      .from('user_content_reflections')
      .upsert(
        {
          profile_id: user.id,
          content_id: contentId,
          response: trimmed,
          submitted_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,content_id' },
      )
    if (error) return { ok: false, message: error.message }

    revalidatePath(
      `/phases/${item.year_id}/modules/${item.module_id}/items/${contentId}`,
    )
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}
