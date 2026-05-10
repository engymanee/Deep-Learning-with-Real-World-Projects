import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { NotificationFeedItem, NotificationRow } from './types'

interface RecipientRow {
  id: string
  notification_id: string
  read_at: string | null
}

/**
 * Returns the notifications the current user can see, in feed order
 * (pinned first, then most recent), with their personal read state
 * left-joined in. Falls back to `published_at` for legacy rows that
 * pre-date the unified `sent_at` column.
 *
 * RLS on `notifications` already enforces audience visibility, so we
 * just query through the user-scoped client.
 */
export async function getNotificationFeedForUser(
  userId: string,
  options: { limit?: number; onlyUnread?: boolean } = {},
): Promise<NotificationFeedItem[]> {
  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200)
  const supabase = await createClient()

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('status', 'sent')
    .order('pinned', { ascending: false })
    .order('sent_at', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit)

  if (error) throw error
  const rows = (notifications ?? []) as NotificationRow[]
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)
  // Read state lives in notification_recipients - own RLS allows the
  // user to read their own rows directly.
  const { data: recipients } = await supabase
    .from('notification_recipients')
    .select('id, notification_id, read_at')
    .eq('profile_id', userId)
    .in('notification_id', ids)

  const recipientByNotification = new Map<string, RecipientRow>()
  for (const r of (recipients ?? []) as RecipientRow[]) {
    recipientByNotification.set(r.notification_id, r)
  }

  const items: NotificationFeedItem[] = rows.map((row) => {
    const r = recipientByNotification.get(row.id)
    return {
      ...row,
      read_at: r?.read_at ?? null,
      recipient_id: r?.id ?? null,
    }
  })

  return options.onlyUnread ? items.filter((i) => !i.read_at) : items
}

/**
 * Lightweight count for the bell badge. Counts visible sent
 * notifications that either have no recipient row for the user or
 * whose recipient row has read_at = null.
 */
export async function getUnreadNotificationCount(
  userId: string,
): Promise<number> {
  const items = await getNotificationFeedForUser(userId, { onlyUnread: true })
  return items.length
}

/**
 * Marks a single notification as read for the user. Inserts a
 * recipient row if one does not exist (e.g. legacy announcements).
 * Uses the admin client because legacy rows have no recipient row
 * yet, and we want to insert one even if no audience match was
 * recorded by the dispatcher.
 */
export async function markNotificationRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  await admin
    .from('notification_recipients')
    .upsert(
      {
        notification_id: notificationId,
        profile_id: userId,
        email_status: 'skipped',
        read_at: now,
      },
      { onConflict: 'notification_id,profile_id' },
    )

  // Upsert with conflict ignore_duplicates would skip the read_at
  // update on existing rows; do an explicit update to make sure
  // read_at is set whether the row was just inserted or pre-existed.
  await admin
    .from('notification_recipients')
    .update({ read_at: now })
    .eq('notification_id', notificationId)
    .eq('profile_id', userId)
    .is('read_at', null)
}

/**
 * Marks every visible unread notification as read for the user.
 */
export async function markAllNotificationsRead(userId: string): Promise<void> {
  const unread = await getNotificationFeedForUser(userId, { onlyUnread: true })
  if (unread.length === 0) return
  for (const item of unread) {
    await markNotificationRead(userId, item.id)
  }
}
