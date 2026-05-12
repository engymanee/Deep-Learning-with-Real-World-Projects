import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { getFailedEmailsForRetry, updateEmailLogStatus } from '@/lib/email/logs'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/email-logs/retry-failed
 * Retry all failed emails from the past week
 */
export async function POST(req: NextRequest) {
  try {
    await requireAdmin()

    const failedEmails = await getFailedEmailsForRetry()

    if (failedEmails.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No failed emails to retry',
        retriedCount: 0,
      })
    }

    // For now, mark them as pending for manual review
    // In a production system, you might integrate with Resend to actually resend
    const supabase = await createClient()
    
    const retriedEmails = failedEmails.slice(0, 10) // Limit to 10 at a time

    for (const email of retriedEmails) {
      await updateEmailLogStatus(email.id, 'pending', {
        errorMessage: undefined,
      })
    }

    return NextResponse.json({
      success: true,
      message: `Marked ${retriedEmails.length} emails for retry`,
      retriedCount: retriedEmails.length,
    })
  } catch (err) {
    console.error('[v0] Error retrying failed emails:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
