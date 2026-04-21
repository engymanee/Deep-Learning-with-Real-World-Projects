'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'

export type ToggleBlockResult =
  | { ok: true; completed: boolean }
  | { ok: false; message: string }

/**
 * Toggle completion for a single lab content block for the signed-in user.
 *
 * - `completed = true`  -> upsert a row in user_block_completions.
 * - `completed = false` -> delete that row.
 *
 * Revalidates the lab page so progress bars + checkboxes stay in sync
 * without forcing the client to re-fetch.
 */
export async function toggleBlockCompletion(
  blockId: string,
  labId: string,
  completed: boolean,
): Promise<ToggleBlockResult> {
  try {
    const user = await requireUser()
    const supabase = await createClient()

    if (completed) {
      const { error } = await supabase
        .from('user_block_completions')
        .upsert(
          { profile_id: user.id, block_id: blockId, completed_at: new Date().toISOString() },
          { onConflict: 'profile_id,block_id' },
        )
      if (error) return { ok: false, message: error.message }
    } else {
      const { error } = await supabase
        .from('user_block_completions')
        .delete()
        .eq('profile_id', user.id)
        .eq('block_id', blockId)
      if (error) return { ok: false, message: error.message }
    }

    revalidatePath(`/labs/${labId}`)
    return { ok: true, completed }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { ok: false, message }
  }
}
