'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface EmailLogEntry {
  id: string
  type: 'invitation' | 'notification'
  recipient_email: string
  recipient_name: string | null
  subject: string
  status: 'sent' | 'failed' | 'pending'
  error_message: string | null
  provider_id: string | null
  sent_at: string | null
  created_at: string
}

/**
 * Get email logs from the past week, with pagination.
 * Combines invitations and notification_recipients for a unified view.
 */
export async function getRecentEmailLogs(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  logs: EmailLogEntry[]
  total: number
  pageCount: number
}> {
  const admin = createAdminClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    // Query both invitations and notification_recipients
    const [invitations, notifications] = await Promise.all([
      admin
        .from('invitations')
        .select('id, email, full_name, status, last_error, email_provider_id, last_sent_at, created_at')
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: false }),
      admin
        .from('notification_recipients')
        .select(`
          id, 
          email, 
          email_status, 
          email_error, 
          email_provider_id, 
          email_sent_at, 
          created_at,
          notification_id,
          notifications(kind, title, message)
        `)
        .gte('created_at', oneWeekAgo)
        .order('created_at', { ascending: false }),
    ])

    if (invitations.error) throw invitations.error
    if (notifications.error) throw notifications.error

    const logs: EmailLogEntry[] = []

    // Map invitations
    if (invitations.data) {
      logs.push(
        ...invitations.data.map((row: any) => ({
          id: row.id,
          type: 'invitation' as const,
          recipient_email: row.email,
          recipient_name: row.full_name,
          subject: 'Invitation',
          status: (row.status === 'sent' ? 'sent' : row.status === 'failed' ? 'failed' : 'pending') as 'sent' | 'failed' | 'pending',
          error_message: row.last_error,
          provider_id: row.email_provider_id,
          sent_at: row.last_sent_at,
          created_at: row.created_at,
        }))
      )
    }

    // Map notification recipients
    if (notifications.data) {
      logs.push(
        ...notifications.data
          .filter((row: any) => row.email) // Only include entries with email addresses
          .map((row: any) => ({
            id: row.id,
            type: 'notification' as const,
            recipient_email: row.email,
            recipient_name: null,
            subject: row.notifications?.title || row.notifications?.kind || 'Notification',
            status: (row.email_status === 'sent' ? 'sent' : row.email_status === 'failed' ? 'failed' : 'pending') as 'sent' | 'failed' | 'pending',
            error_message: row.email_error,
            provider_id: row.email_provider_id,
            sent_at: row.email_sent_at,
            created_at: row.created_at,
          }))
      )
    }

    // Sort by created_at descending
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Paginate
    const total = logs.length
    const pageCount = Math.ceil(total / pageSize)
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      logs: logs.slice(start, end),
      total,
      pageCount,
    }
  } catch (err) {
    console.error('[v0] Failed to fetch email logs:', err)
    return { logs: [], total: 0, pageCount: 0 }
  }
}

/**
 * Get failed emails from the past week for retry.
 */
export async function getFailedEmailsForRetry(limit: number = 50): Promise<EmailLogEntry[]> {
  const admin = createAdminClient()
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  try {
    const [failedInvitations, failedNotifications] = await Promise.all([
      admin
        .from('invitations')
        .select('id, email, full_name, status, last_error, email_provider_id, last_sent_at, created_at')
        .eq('status', 'failed')
        .gte('created_at', oneWeekAgo)
        .order('last_sent_at', { ascending: true })
        .limit(limit),
      admin
        .from('notification_recipients')
        .select(`
          id, 
          email, 
          email_status, 
          email_error, 
          email_provider_id, 
          email_sent_at, 
          created_at,
          notification_id,
          notifications(kind, title, message)
        `)
        .eq('email_status', 'failed')
        .gte('created_at', oneWeekAgo)
        .order('email_sent_at', { ascending: true })
        .limit(limit),
    ])

    if (failedInvitations.error) throw failedInvitations.error
    if (failedNotifications.error) throw failedNotifications.error

    const logs: EmailLogEntry[] = []

    if (failedInvitations.data) {
      logs.push(
        ...failedInvitations.data.map((row: any) => ({
          id: row.id,
          type: 'invitation' as const,
          recipient_email: row.email,
          recipient_name: row.full_name,
          subject: 'Invitation',
          status: 'failed' as const,
          error_message: row.last_error,
          provider_id: row.email_provider_id,
          sent_at: row.last_sent_at,
          created_at: row.created_at,
        }))
      )
    }

    if (failedNotifications.data) {
      logs.push(
        ...failedNotifications.data
          .filter((row: any) => row.email) // Only include entries with email addresses
          .map((row: any) => ({
            id: row.id,
            type: 'notification' as const,
            recipient_email: row.email,
            recipient_name: null,
            subject: row.notifications?.title || row.notifications?.kind || 'Notification',
            status: 'failed' as const,
            error_message: row.email_error,
            provider_id: row.email_provider_id,
            sent_at: row.email_sent_at,
            created_at: row.created_at,
          }))
      )
    }

    return logs.sort((a, b) => new Date(b.sent_at || 0).getTime() - new Date(a.sent_at || 0).getTime()).slice(0, limit)
  } catch (err) {
    console.error('[v0] Failed to fetch failed emails:', err)
    return []
  }
}

