'use server'

import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export type ActivateResult = { ok: true } | { ok: false; error: string }

/**
 * Completes activation by verifying the one-time invite token and
 * setting a real password for the now-authenticated user. The session
 * cookies are written by the server-side Supabase client during
 * verifyOtp, so by the time the client navigates away the user is
 * fully signed in.
 *
 * Failures fall into two buckets:
 *   - the token is missing/expired/already used (verifyOtp throws)
 *   - the password is rejected (length/complexity etc.)
 * Both are surfaced as friendly messages so the activation page can
 * render them without exposing internal error strings.
 */
export async function activateWithPasswordAction(args: {
  tokenHash: string
  type: EmailOtpType
  password: string
}): Promise<ActivateResult> {
  const tokenHash = args.tokenHash?.trim()
  const type = args.type
  const password = args.password ?? ''

  if (!tokenHash || !type) {
    return {
      ok: false,
      error:
        'This activation link is missing required fields. Ask your program admin to resend your invitation.',
    }
  }
  if (password.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters.' }
  }

  const supabase = await createClient()

  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  })
  if (verifyErr) {
    return {
      ok: false,
      error:
        'This activation link is invalid or has expired. Ask your program admin to resend your invitation, or use the email-code option below.',
    }
  }

  const { error: updateErr } = await supabase.auth.updateUser({ password })
  if (updateErr) {
    return { ok: false, error: updateErr.message }
  }

  return { ok: true }
}
