import { createClient } from '@/lib/supabase/server'

export interface MaintenanceAction {
  actionType: string
  itemType: string
  itemId?: string | null
  itemName?: string | null
  details?: Record<string, any>
}

/**
 * Log a maintenance action to the audit log
 * Should only be called from admin endpoints
 */
export async function logMaintenanceAction(
  adminId: string,
  action: MaintenanceAction,
) {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('maintenance_audit_log').insert({
      admin_id: adminId,
      action_type: action.actionType,
      item_type: action.itemType,
      item_id: action.itemId,
      item_name: action.itemName,
      details: action.details,
    })

    if (error) {
      console.error('[v0] Error logging maintenance action:', error)
      throw error
    }
  } catch (err) {
    console.error('[v0] Failed to log maintenance action:', err)
    // Don't throw - logging failure shouldn't block the actual action
  }
}
