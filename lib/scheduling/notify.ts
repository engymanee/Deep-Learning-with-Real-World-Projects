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
 * Sends emails notifying them to set their availability for the poll.
 */
export async function createSchedulingNotification(
  scheduleId: string,
  scheduleTitle: string,
  fellowIds: string[],
  adminId: string,
): Promise<void> {
  if (fellowIds.length === 0) return

  const supabase = await createClient()

  // Fetch fellow details including emails
  const { data: fellows } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', fellowIds)

  if (!fellows || fellows.length === 0) {
    console.log('[v0] No fellows found for scheduling notification:', fellowIds)
    return
  }

  const votingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://leadership.app'}/schedule/${scheduleId}/vote`

  // Send emails to all fellows
  const emailPromises = fellows.map(async (fellow) => {
    if (!fellow.email) {
      console.warn(`[v0] Fellow ${fellow.id} (${fellow.full_name}) has no email address`)
      return
    }

    try {
      const result = await sendSchedulingInviteEmail(
        fellow.email,
        fellow.full_name,
        scheduleTitle,
        votingUrl,
      )

      if (result.ok) {
        console.log(`[v0] Sent scheduling email to ${fellow.email} (id: ${result.id})`)
      } else {
        console.error(
          `[v0] Failed to send scheduling email to ${fellow.email}:`,
          result.error,
        )
      }
    } catch (err) {
      console.error(`[v0] Exception sending scheduling email to ${fellow.email}:`, err)
    }
  })

  await Promise.all(emailPromises)

  console.log(
    `[v0] Sent scheduling availability invitations to ${fellows.length} fellows for schedule: ${scheduleId}`,
  )
}


