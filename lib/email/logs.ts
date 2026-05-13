'use server'

import { createClient } from '@/lib/supabase/server'
import type { EmailLogEntry } from '@/lib/email/types'

/**
 * Log an email send attempt to the email_logs table.
 * Called after attempting to send an email via Resend.
 */
export async function logEmail(data: {
  recipientEmail: string
  recipientName?: string | null
  subject: string
  emailType: 'invitation' | 'notification' | 'scheduling' | 'announcement' | 'other'
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  resendId?: string | null
  errorMessage?: string | null
  sentAt?: string | null
  metadata?: Record<string, any> | null
}): Promise<void> {
  try {
    const supabase = await createClient()
    
    const { error } = await supabase.from('email_logs').insert({
      recipient_email: data.recipientEmail,
      recipient_name: data.recipientName ?? null,
      subject: data.subject,
      email_type: data.emailType,
      status: data.status,
      resend_id: data.resendId ?? null,
      error_message: data.errorMessage ?? null,
      sent_at: data.sentAt,
      metadata: data.metadata ?? null,
    })

    if (error) {
      console.error('[v0] Failed to log email:', error.message)
    }
  } catch (err) {
    console.error('[v0] Exception logging email:', err)
  }
}

/**
 * Update an email log entry status (e.g., from pending to sent or failed).
 */
export async function updateEmailLogStatus(
  emailLogId: string,
  status: 'sent' | 'failed' | 'bounced',
  updates?: {
    resendId?: string
    errorMessage?: string
    sentAt?: string
  }
): Promise<void> {
  try {
    const supabase = await createClient()
    
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    }
    
    if (updates?.resendId) updateData.resend_id = updates.resendId
    if (updates?.errorMessage) updateData.error_message = updates.errorMessage
    if (updates?.sentAt) updateData.sent_at = updates.sentAt

    const { error } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', emailLogId)

    if (error) {
      console.error('[v0] Failed to update email log:', error.message)
    }
  } catch (err) {
    console.error('[v0] Exception updating email log:', err)
  }
}

/**
 * Get email logs from the past week, with pagination.
 */
export async function getRecentEmailLogs(
  page: number = 1,
  pageSize: number = 20
): Promise<{
  logs: EmailLogEntry[]
  total: number
  pageCount: number
}> {
  const supabase = await createClient()
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data, count, error } = await supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)

  if (error) {
    console.error('[v0] Failed to fetch email logs:', error.message)
    return { logs: [], total: 0, pageCount: 0 }
  }

  return {
    logs: (data as EmailLogEntry[]) ?? [],
    total: count ?? 0,
    pageCount: Math.ceil((count ?? 0) / pageSize),
  }
}

/**
 * Get failed emails from the past week for retry.
 */
export async function getFailedEmailsForRetry(limit: number = 50): Promise<EmailLogEntry[]> {
  const supabase = await createClient()
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('status', 'failed')
    .gte('created_at', oneWeekAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Failed to fetch failed emails:', error.message)
    return []
  }

  return (data as EmailLogEntry[]) ?? []
}
