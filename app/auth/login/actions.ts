'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendSignInCodeEmail } from '@/lib/email/send'

export type SendCodeResult =
  | { ok: true; email: string }
  | { ok: false; error: string }

/**
 * Issues a 6-digit one-time sign-in code and emails it via Resend.
 *
 * We deliberately avoid the client-side `signInWithOtp` flow because
 * Supabase's hosted email template ships a magic link alongside the
 * OTP, and the project requires a code-only experience. To get just
 * the digits we use the admin API: `generateLink({ type: 'magiclink' })`
 * returns `email_otp` in its properties. We send it ourselves through
 * the existing branded Resend pipeline. The user then submits the
 * code on the login page, which calls
 * `supabase.auth.verifyOtp({ type: 'email', email, token })` to
 * establish a session.
 */
export async function requestSignInCodeAction(
  rawEmail: string,
): Promise<SendCodeResult> {
  const email = String(rawEmail ?? '').trim().toLowerCase()
  if (!email) {
    return { ok: false, error: 'Enter your program email to receive a code.' }
  }

  try {
    const admin = createAdminClient()

    // The portal is invite-only; only existing users can request a
    // code. `generateLink({ type: 'magiclink' })` returns an error if
    // the user does not exist, which is the behavior we want.
    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (error) {
      // Be slightly vague to avoid leaking which addresses are
      // registered, but still surface "not invited" to friendly users.
      const msg = /not.*found|user.*not.*registered|invalid.*email/i.test(
        error.message,
      )
        ? "We couldn't find an account for that email. Check the address or contact the WaW team."
        : error.message
      return { ok: false, error: msg }
    }

    const code = data?.properties?.email_otp
    if (!code) {
      return {
        ok: false,
        error: 'Could not generate a sign-in code. Please try again.',
      }
    }

    // Pull the user's name for a friendlier greeting; not fatal if
    // the profile lookup fails.
    let recipientName: string | null = null
    try {
      const { data: profile } = await admin
        .from('profiles')
        .select('full_name')
        .eq('email', email)
        .maybeSingle<{ full_name: string | null }>()
      recipientName = profile?.full_name ?? null
    } catch {
      // ignore - greeting falls back to "there"
    }

    const result = await sendSignInCodeEmail(email, {
      recipientName,
      code,
      // Supabase OTP TTL defaults to 1 hour. Match that copy here
      // unless the project later overrides it in the Supabase dashboard.
      expiresInLabel: '1 hour',
    })

    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    return { ok: true, email }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}
