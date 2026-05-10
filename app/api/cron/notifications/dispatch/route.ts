import { NextRequest, NextResponse } from 'next/server'
import { dispatchDueNotifications } from '@/lib/notifications/dispatch'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Cron entry point that dispatches every notification whose
 * scheduled_for is in the past. Wire this to Vercel Cron (e.g. every
 * 5 minutes) and protect with a CRON_SECRET that the cron config
 * passes in the Authorization header.
 *
 * Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. We
 * accept GET (Vercel default) and POST so this is also reachable
 * from the manual /admin/notifications "Send now" path if we ever
 * route through here.
 */
async function handle(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: 'CRON_SECRET is not configured' },
      { status: 500 },
    )
  }
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  try {
    const result = await dispatchDueNotifications()
    return NextResponse.json({
      ok: true,
      picked: result.picked,
      summary: result.results.map((r) => ({
        id: r.notificationId,
        status: r.status,
        recipients: r.recipientsResolved,
        emailsSent: r.emailsSent,
        emailsFailed: r.emailsFailed,
        emailsSkipped: r.emailsSkipped,
        error: r.error,
      })),
    })
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'Dispatcher failed',
      },
      { status: 500 },
    )
  }
}

export const GET = handle
export const POST = handle
