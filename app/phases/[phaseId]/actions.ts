'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'

export type ToggleItemResult =
  | { ok: true; completed: boolean }
  | { ok: false; message: string }

/**
 * Toggle completion for a single content item for the signed-in user.
 *
 * In the flat phase -> content-item model, a content item *is* the
 * unit of progress. Marking an item complete writes a row in
 * `user_lab_progress` (status='complete', progress=100); unmarking
 * removes it. Phase progress is computed at render time as the share
 * of completed items per phase.
 *
 *  - `completed = true`  -> upsert with status complete + progress 100
 *  - `completed = false` -> delete the row entirely
 */
export async function toggleItemCompletion(
  itemId: string,
  phaseId: string,
  completed: boolean,
): Promise<ToggleItemResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    if (completed) {
      const { error } = await supabase.from('user_lab_progress').upsert(
        {
          profile_id: user.id,
          lab_id: itemId,
          status: 'complete',
          progress: 100,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,lab_id' },
      )
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabase
        .from('user_lab_progress')
        .delete()
        .eq('profile_id', user.id)
        .eq('lab_id', itemId)
      if (error) return { ok: false, message: error.message }
    }

    revalidatePath(`/phases/${phaseId}`)
    revalidatePath('/dashboard')
    return { ok: true, completed }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, message }
  }
}
