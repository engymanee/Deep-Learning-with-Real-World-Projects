import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { requireAdmin } from '@/lib/auth-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TEST_RECIPIENT = 'ngozi.nnamani@gmail.com'
const TEST_FROM = 'Wisdom at Work Portal <onboarding@resend.dev>'
const TEST_SUBJECT = 'Test email from the Wisdom at Work portal'
const TEST_BODY = 'This is a test email from the Wisdom at Work portal.'

export async function POST() {
  // Admin-only - requireAdmin will throw a redirect for non-admins.
  await requireAdmin()

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: 'RESEND_API_KEY is not set' },
      { status: 500 },
    )
  }

  try {
    const resend = new Resend(apiKey)
    const { data, error } = await resend.emails.send({
      from: TEST_FROM,
      to: [TEST_RECIPIENT],
      subject: TEST_SUBJECT,
      text: TEST_BODY,
    })

    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message ?? 'Resend returned an error' },
        { status: 502 },
      )
    }

    return NextResponse.json({
      ok: true,
      id: data?.id ?? null,
      to: TEST_RECIPIENT,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
