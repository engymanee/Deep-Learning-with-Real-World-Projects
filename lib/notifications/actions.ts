'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth-server'
import {
  markAllNotificationsRead,
  markNotificationRead,
} from './feed'

/**
 * Marks a single notification as read for the current user. Idempotent
 * (safe to call from a button without optimistic-collision worries).
 */
export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await requireUser()
    await markNotificationRead(user.id, notificationId)
    revalidatePath('/notifications')
    revalidatePath('/dashboard')
    return { ok: true as const }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'Could not mark as read',
    }
  }
}

/**
 * Marks every visible unread notification as read for the user.
 */
export async function markAllNotificationsReadAction() {
  try {
    const user = await requireUser()
    await markAllNotificationsRead(user.id)
    revalidatePath('/notifications')
    revalidatePath('/dashboard')
    return { ok: true as const }
  } catch (e) {
    return {
      ok: false as const,
      error: e instanceof Error ? e.message : 'Could not mark all as read',
    }
  }
}
