import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth-server'
import { updateEmailLogStatus } from '@/lib/email/logs'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/admin/email-logs/[id]/resend
 * Resend a single failed email
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
    const { id } = await params

    const supabase = await createClient()

    // Fetch the email log
    const { data: emailLog, error: fetchError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !emailLog) {
      return NextResponse.json(
        { success: false, error: 'Email log not found' },
        { status: 404 }
      )
    }

    // Mark as pending for retry
    await updateEmailLogStatus(id, 'pending', {
      errorMessage: undefined,
    })

    return NextResponse.json({
      success: true,
      message: 'Email marked for retry',
    })
  } catch (err) {
    console.error('[v0] Error resending email:', err)
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
