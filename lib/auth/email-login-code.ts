import { randomInt, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Owns the lifecycle of the 6-digit numeric sign-in/activation codes
 * the platform mails out via Resend. We deliberately do NOT delegate
 * to Supabase's `email_otp` here:
 *
 *   - Supabase's OTP length is a project-level setting (defaulting to
 *     6 but easily 8), and the project must guarantee 6 digits.
 *   - Calling `admin.generateLink` for a not-yet-confirmed user has
 *     side effects (the user's email_confirmed_at gets stamped),
 *     which conflicts with the requirement that the account remain
 *     inactive until the recipient enters the code.
 *
 * Codes are stored hashed (scrypt + per-row salt) in
 * `public.email_login_codes` with a short TTL and single-use semantics.
 * Issuing a fresh code invalidates any prior open codes for that email.
 */

const CODE_LENGTH = 6
const TTL_MINUTES = 10

function generate6DigitCode(): string {
  // crypto.randomInt is uniform over [min, max). Padding with leading
  // zeros guarantees the literal 6-character output the spec requires.
  const n = randomInt(0, 1_000_000)
  return String(n).padStart(CODE_LENGTH, '0')
}

function hashCode(code: string, salt: string): Buffer {
  return scryptSync(code, salt, 32)
}

export type IssueResult = {
  /** The plaintext 6-digit code. NEVER log or persist this. */
  code: string
  expiresAt: Date
}

export async function issueLoginCode(rawEmail: string): Promise<IssueResult> {
  const email = String(rawEmail ?? '').trim().toLowerCase()
  if (!email) throw new Error('Email is required')

  const admin = createAdminClient()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + TTL_MINUTES * 60_000)

  // Invalidate any still-open codes for this email so a freshly issued
  // code is the only one that can verify. This satisfies the
  // "resending invalidates the previous code" requirement.
  await admin
    .from('email_login_codes')
    .update({ used_at: now.toISOString() })
    .eq('email', email)
    .is('used_at', null)

  const code = generate6DigitCode()
  const salt = randomBytes(16).toString('hex')
  const codeHash = hashCode(code, salt).toString('hex')

  const { error } = await admin.from('email_login_codes').insert({
    email,
    code_hash: codeHash,
    salt,
    expires_at: expiresAt.toISOString(),
  })
  if (error) throw new Error(error.message)

  return { code, expiresAt }
}

export type VerifyFailure = 'invalid' | 'expired' | 'missing'
export type VerifyResult = { ok: true } | { ok: false; reason: VerifyFailure }

/**
 * Verifies a 6-digit code against the most recent open row for the
 * given email. Marks the row as used regardless of failure mode (when
 * the failure is "wrong code", the row is left intact so the user can
 * retry until they get it right; when the failure is "expired" the
 * row is consumed so it cannot be retried).
 */
export async function verifyLoginCode(
  rawEmail: string,
  rawCode: string,
): Promise<VerifyResult> {
  const email = String(rawEmail ?? '').trim().toLowerCase()
  const code = String(rawCode ?? '').trim()
  if (!email || !/^\d{6}$/.test(code)) return { ok: false, reason: 'invalid' }

  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('email_login_codes')
    .select('id, code_hash, salt, expires_at')
    .eq('email', email)
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
  if (error) throw new Error(error.message)
  const row = rows?.[0]
  if (!row) return { ok: false, reason: 'missing' }

  const computed = hashCode(code, row.salt)
  const stored = Buffer.from(row.code_hash, 'hex')
  const matches =
    computed.length === stored.length && timingSafeEqual(computed, stored)
  if (!matches) {
    // Don't burn the code on a wrong guess - let the user retry.
    return { ok: false, reason: 'invalid' }
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Burn the row so an expired code can't be retried.
    await admin
      .from('email_login_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', row.id)
    return { ok: false, reason: 'expired' }
  }

  // Single-use: stamp used_at on success.
  await admin
    .from('email_login_codes')
    .update({ used_at: new Date().toISOString() })
    .eq('id', row.id)

  return { ok: true }
}
