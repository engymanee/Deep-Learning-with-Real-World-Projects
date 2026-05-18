'use server'

import { createClient } from '@/lib/supabase/server'
import { sendEmail, type SendResult } from '@/lib/email/client'
import { renderSchedulingInviteEmail } from '@/lib/email/templates/scheduling'

/**
 * High-level wrapper for sending scheduling availability invitations.
 * Renders the template and dispatches via Resend.
 */
async function sendSchedulingInviteEmail(
  to: string,
  fellowName: string | null,
  scheduleTitle: string,
  votingUrl: string,
): Promise<SendResult> {
  const { subject, html, text } = renderSchedulingInviteEmail({
    fellowName,
    scheduleTitle,
    votingUrl,
  })
  return sendEmail({
    to,
    subject,
    html,
    text,
    tags: [{ name: 'category', value: 'scheduling' }],
  })
}

/**
 * Create a scheduling notification for all invited fellows.
 * Sends emails and creates in-app notifications notifying them to set their availability for the poll.
 */
export async function createSchedulingNotification(
  scheduleId: string,
  scheduleTitle: string,
  fellowIds: string[],
  adminId: string,
): Promise<void> {
  if (fellowIds.length === 0) {
    console.log('[v0] createSchedulingNotification: No fellows provided')
    return
  }

  console.log(`[v0] createSchedulingNotification: Starting for schedule ${scheduleId}, fellows: ${fellowIds.length}`)

  const supabase = await createClient()

  // Fetch fellow details including emails
  const { data: fellows, error: fetchError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', fellowIds)

  if (fetchError) {
    console.error('[v0] Error fetching fellows for notification:', fetchError)
    return
  }

  if (!fellows || fellows.length === 0) {
    console.log('[v0] No fellows found for scheduling notification:', fellowIds)
    return
  }

  console.log(`[v0] Found ${fellows.length} fellows to notify`)

  const votingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadership.app'}/schedule/${scheduleId}`
  console.log(`[v0] Voting URL: ${votingUrl}`)

  // Send emails to all fellows and track results
  console.log(`[v0] Starting email sending for ${fellows.length} fellows`)
  const emailResults = await Promise.all(
    fellows.map(async (fellow) => {
      if (!fellow.email) {
        console.warn(`[v0] Fellow ${fellow.id} (${fellow.full_name}) has no email address`)
        return { fellowId: fellow.id, success: false, providerId: null }
      }

      console.log(`[v0] Sending email to ${fellow.email}`)
      try {
        const result = await sendSchedulingInviteEmail(
          fellow.email,
          fellow.full_name,
          scheduleTitle,
          votingUrl,
        )

        if (result.ok) {
          console.log(`[v0] ✓ Sent scheduling email to ${fellow.email} (id: ${result.id})`)
          return { fellowId: fellow.id, success: true, providerId: result.id }
        } else {
          console.error(
            `[v0] ✗ Failed to send scheduling email to ${fellow.email}:`,
            result.error,
          )
          return { fellowId: fellow.id, success: false, providerId: null }
        }
      } catch (err) {
        console.error(`[v0] Exception sending scheduling email to ${fellow.email}:`, err)
        return { fellowId: fellow.id, success: false, providerId: null }
      }
    })
  )
  console.log('[v0] Email sending completed')

  // Create in-app notifications for all fellows
  console.log('[v0] Starting in-app notification creation')
  try {
    // First, create the notification entry
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .insert({
        kind: 'schedule_poll_invite',
        title: `You're invited to share your availability`,
        message: `${scheduleTitle} - Please set your availability for this meeting.`,
        cta_url: votingUrl,
        cta_label: 'Set Availability',
        created_by_admin: adminId,
      })
      .select('id')
      .single()

    if (notifError) {
      console.error('[v0] Error creating notification:', notifError)
      return
    }

    console.log(`[v0] Created notification with id: ${notification.id}`)

    // Create notification_recipients for each fellow with email tracking
    const recipientInserts = fellows.map((fellow) => {
      const emailResult = emailResults.find((r) => r.fellowId === fellow.id)
      const emailSuccess = emailResult?.success ?? false
      
      return {
        notification_id: notification.id,
        profile_id: fellow.id,
        read_at: null,
        email_status: emailSuccess ? 'sent' : 'failed',
        email_provider_id: emailResult?.providerId || null,
        email_sent_at: emailSuccess ? new Date().toISOString() : null,
      }
    })

    const { error: recipientError } = await supabase
      .from('notification_recipients')
      .insert(recipientInserts)

    if (recipientError) {
      console.error('[v0] Error creating notification recipients:', recipientError)
    } else {
      console.log(
        `[v0] ✓ Created in-app notifications for ${fellows.length} fellows for schedule: ${scheduleId}`,
      )
    }
  } catch (err) {
    console.error('[v0] Exception creating in-app notifications:', err)
  }

  console.log(
    `[v0] ✓ Completed scheduling notifications for ${fellows.length} fellows for schedule: ${scheduleId}`,
  )
}


