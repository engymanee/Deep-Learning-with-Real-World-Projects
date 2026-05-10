'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { sendSignInCodeEmail } from '@/lib/email/send'
import { issueLoginCode, verifyLoginCode } from '@/lib/auth/email-login-code'
import { markInvitationAccepted } from '@/lib/invitations/invite'

export type SendCodeResult =
  | { ok: true; email: string }
  | { ok: false; error: string }

/**
 * Issues a fresh 6-digit numeric sign-in code and emails it via Resend.
 *
 * Uses our own `email_login_codes` table (see lib/auth/email-login-code.ts)
 * instead of `admin.generateLink({ type: 'magiclink' })`. That older
 * approach had two problems:
 *
 *   1. Supabase's `email_otp` length is project-configurable, so we
 *      could end up emailing 8 digits when the spec demands 6.
 *   2. `generateLink` also returns an action_link AND auto-confirms
 *      the user's email server-side. Combined with the proxy that
 *      redirects authenticated users away from /auth/login, that was
 *      the source of the "fellow gets logged in immediately after
 *      requesting a code" bug. Our own helper has no such side
 *      effects: nothing about the user's auth state changes until the
 *      code is verified by `verifyEmailLoginCodeAction`.
 *
 * The portal is invite-only, so we first confirm the email matches a
 * known profile and refuse otherwise.
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

    const { data: profile } = await admin
      .from('profiles')
      .select('email, full_name')
      .eq('email', email)
      .maybeSingle<{ email: string | null; full_name: string | null }>()

    if (!profile) {
      return {
        ok: false,
        error:
          "We couldn't find an account for that email. Check the address or contact the WaW team.",
      }
    }

    const { code } = await issueLoginCode(email)

    const sendResult = await sendSignInCodeEmail(email, {
      recipientName: profile.full_name,
      code,
      expiresInLabel: '10 minutes',
    })
    if (!sendResult.ok) {
      return { ok: false, error: sendResult.error }
    }

    return { ok: true, email }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Unknown error',
    }
  }
}

export type VerifyCodeResult = { ok: true } | { ok: false; error: string }

/**
 * Verifies the 6-digit code the user typed. On success:
 *   1. Marks our own code row as used (single-use).
 *   2. Mints a Supabase session via `admin.generateLink` +
 *      `verifyOtp` on the cookie-aware server client, so the response
 *      carries the auth cookies. This keeps the rest of the platform
 *      (RLS, getUser, etc.) working unchanged - the user IS a real
 *      Supabase session-bearer once this succeeds.
 *   3. If the verification was the activation step for an invited
 *      fellow, flips the `invitations` row to "accepted" so admin
 *      tooling reflects the change.
 *
 * Notes:
 *   - We only call `admin.generateLink` AFTER a successful code
 *     match. The user does not gain any auth state from merely
 *     requesting a code - that was the "immediate login" bug.
 *   - `verifyOtp({ type: 'magiclink', token_hash })` doesn't email
 *     anything; it just exchanges the freshly minted hash for a
 *     session on the response.
 */
export async function verifyEmailLoginCodeAction(
  rawEmail: string,
  rawCode: string,
  opts?: { fromInvite?: boolean },
): Promise<VerifyCodeResult> {
  const email = String(rawEmail ?? '').trim().toLowerCase()
  const code = String(rawCode ?? '').trim()
  if (!email) return { ok: false, error: 'Email is required.' }
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: 'Enter the 6-digit code from your email.' }
  }

  const result = await verifyLoginCode(email, code)
  if (!result.ok) {
    const msg =
      result.reason === 'expired'
        ? 'That code has expired. Request a new one.'
        : result.reason === 'missing'
          ? 'No active code for this email. Request a new one.'
          : 'That code is incorrect. Try again or request a new one.'
    return { ok: false, error: msg }
  }

  // Mint a Supabase session on top of the verified code.
  const admin = createAdminClient()
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })
  const tokenHash = linkData?.properties?.hashed_token
  if (linkErr || !tokenHash) {
    return {
      ok: false,
      error: linkErr?.message ?? 'Could not establish session. Try again.',
    }
  }

  const supabase = await createClient()
  const { error: verifyErr } = await supabase.auth.verifyOtp({
    type: 'magiclink',
    token_hash: tokenHash,
  })
  if (verifyErr) return { ok: false, error: verifyErr.message }

  if (opts?.fromInvite) {
    try {
      await markInvitationAccepted(email)
    } catch {
      // Audit-only: must not block sign-in.
    }
  }

  return { ok: true }
}
