'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
} from '@/lib/curriculum'

export type ToggleResult =
  | { ok: true; completed: boolean }
  | { ok: false; message: string }

/**
 * Toggle the current user's completion of a content item.
 *
 * Validates the full Phase -> Module -> Content visibility cascade
 * before writing, so a user can't mark complete an item they
 * shouldn't see. Idempotent: calling twice with the same intent
 * just no-ops.
 *
 * Revalidates the affected phase, module, and item paths so the
 * sidebar tree and the right pane both reflect the new state.
 */
export async function toggleContentCompletion(
  contentId: string,
  /**
   * What the *new* state should be. Sent from the client so we don't
   * have to round-trip a SELECT first.
   */
  nextCompleted: boolean,
): Promise<ToggleResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    if (!contentId) return { ok: false, message: 'Missing content id' }

    // Look up the row plus its module and phase so we can check
    // visibility. labs.year_id is denormalised which keeps this to a
    // single round-trip.
    const { data: item, error } = await supabase
      .from('labs')
      .select(
        'id, year_id, module_id, cohorts, modules:module_id (cohorts), years:year_id (cohorts)',
      )
      .eq('id', contentId)
      .maybeSingle<{
        id: string
        year_id: string
        module_id: string | null
        cohorts: string[] | null
        modules: { cohorts: string[] | null } | null
        years: { cohorts: string[] | null } | null
      }>()

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

    if (nextCompleted) {
      // upsert keeps this idempotent if the row already exists.
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

    revalidatePath(`/phases/${item.year_id}`)
    revalidatePath(`/phases/${item.year_id}/modules/${item.module_id}`)
    revalidatePath(
      `/phases/${item.year_id}/modules/${item.module_id}/items/${contentId}`,
    )
    revalidatePath('/dashboard')

    return { ok: true, completed: nextCompleted }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}
