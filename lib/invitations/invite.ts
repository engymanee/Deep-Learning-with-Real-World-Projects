import { createAdminClient } from '@/lib/supabase/admin'
import { sendInvitationEmail } from '@/lib/email/send'
import { isEmailConfigured } from '@/lib/email/client'
import { siteUrl } from '@/lib/site'
import type { Role } from '@/lib/roles'

export interface InvitePayload {
  email: string
  fullName: string
  title?: string | null
  role: Role
  /** cohort_id from the cohorts table (school team membership). */
  schoolTeamId?: string | null
  /** Cohort A/B/C - only valid for fellow role. */
  cohortLetter?: string | null
  /** Display name of the admin issuing the invite (for email body). */
  invitedByName?: string | null
  /** Optional cohort label shown in the invite email body. */
  cohortLabel?: string | null
}

export interface InviteResult {
  ok: boolean
  email: string
  /** Invitation row id we persisted. */
  invitationId?: string
  /** Auth user id of the invitee, if known. */
  userId?: string
  /** The one-time link the recipient should click. */
  actionLink?: string
  /** Provider id from Resend, if email actually sent. */
  emailProviderId?: string | null
  /** True when this call created a new auth user. */
  isNewUser?: boolean
  message?: string
  error?: string
}

/**
 * Builds the URL we put in the invitation email's CTA button. The
 * recipient lands on the regular login page with their email pre-
 * filled and the verify-code step active, where they type the 6-digit
 * code from the same email. We do NOT auto-authenticate from the
 * link - the project requires every login (including the first one
 * post-invite) to go through the verify-code step.
 *
 * `otp_type` is captured here because the OTP issued by `generateLink`
 * needs to be verified with the matching `verifyOtp` type:
 *   - new user (type=invite)        -> verifyOtp({ type: 'invite' })
 *   - existing user (type=magiclink) -> verifyOtp({ type: 'email' })
 * Encoding it in the URL lets the login page do the right thing
 * without a second round-trip to the server.
 */
async function buildLoginUrl(email: string, otpType: 'invite' | 'email'): Promise<string> {
  const params = new URLSearchParams({
    email,
    from: 'invite',
    otp_type: otpType,
    next: '/auth/set-password',
  })
  const url = await siteUrl(`/auth/login?${params.toString()}`)
  if (!url) {
    throw new Error(
      'Cannot determine site URL for invitation link. Set NEXT_PUBLIC_SITE_URL.',
    )
  }
  return url
}

/**
 * Generates a one-time 6-digit sign-in code for the recipient. Tries
 * `invite` first (creates the auth user), falling back to `magiclink`
 * for the resend-an-existing-user case. Returns the code plus the
 * verifyOtp type the login page should use to redeem it.
 */
async function generateInviteCode(
  email: string,
  metadata: Record<string, unknown>,
): Promise<{
  code: string
  otpType: 'invite' | 'email'
  userId: string | undefined
  isNewUser: boolean
}> {
  const admin = createAdminClient()

  const inviteRes = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { data: metadata },
  })

  const inviteOtp = inviteRes.data?.properties?.email_otp
  if (!inviteRes.error && inviteOtp) {
    return {
      code: inviteOtp,
      otpType: 'invite',
      userId: inviteRes.data?.user?.id,
      isNewUser: true,
    }
  }

  // User most likely exists - reissue a magic-link OTP. This is the
  // resend-invite path. Magic-link OTPs verify with type 'email'.
  const magicRes = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  })

  const magicOtp = magicRes.data?.properties?.email_otp
  if (magicRes.error || !magicOtp) {
    throw new Error(
      magicRes.error?.message ??
        inviteRes.error?.message ??
        'Could not generate invitation code',
    )
  }

  return {
    code: magicOtp,
    otpType: 'email',
    userId: magicRes.data?.user?.id,
    isNewUser: false,
  }
}

/**
 * Persist a new invitation row (or update an existing one for the
 * same email). Captures everything we need to surface invite status
 * and retry from the admin UI.
 */
async function upsertInvitation(args: {
  email: string
  fullName: string | null
  title: string | null
  role: Role
  cohortLetter: string | null
  invitedBy: string
}) {
  const admin = createAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await admin
    .from('invitations')
    .upsert(
      {
        email: args.email,
        full_name: args.fullName,
        title: args.title,
        role: args.role,
        cohort: args.cohortLetter,
        status: 'pending',
        invited_by: args.invitedBy,
        invited_at: now,
        last_sent_at: now,
        updated_at: now,
      },
      { onConflict: 'email' },
    )
    .select('id')
    .single<{ id: string }>()

  if (error) throw error
  return data?.id
}

async function markInvitationSent(
  invitationId: string,
  emailProviderId: string | null,
) {
  const admin = createAdminClient()
  await admin
    .from('invitations')
    .update({
      status: 'sent',
      email_provider_id: emailProviderId,
      last_sent_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
}

async function markInvitationFailed(invitationId: string, message: string) {
  const admin = createAdminClient()
  await admin
    .from('invitations')
    .update({
      status: 'failed',
      last_error: message,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
}

async function attachUserId(invitationId: string, userId: string) {
  const admin = createAdminClient()
  await admin
    .from('invitations')
    .update({ supabase_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', invitationId)
}

/**
 * Apply the invite-time profile metadata. The handle_new_user trigger
 * has already created the profiles row; we enrich it with title / role
 * / cohort, and (optionally) attach the user to a school team.
 */
async function applyProfileEnrichment(
  userId: string,
  payload: InvitePayload,
) {
  const admin = createAdminClient()

  const { error: profErr } = await admin
    .from('profiles')
    .update({
      full_name: payload.fullName,
      title: payload.title ?? null,
      role: payload.role,
      cohort: payload.role === 'fellow' ? payload.cohortLetter ?? null : null,
    })
    .eq('id', userId)
  if (profErr) throw profErr

  if (payload.schoolTeamId) {
    const { error: memErr } = await admin
      .from('cohort_members')
      .insert({ cohort_id: payload.schoolTeamId, profile_id: userId })
    if (memErr && !/duplicate/i.test(memErr.message)) {
      throw memErr
    }
  }
}

/**
 * Send a fully branded invitation: generates the magic link, persists
 * an invitations row, sends the email through Resend, and enriches
 * the new profile. Returns a structured result so callers can render
 * per-email feedback (e.g. bulk import).
 */
export async function sendBrandedInvite(
  payload: InvitePayload,
  invitedByProfileId: string,
): Promise<InviteResult> {
  const email = payload.email.trim().toLowerCase()
  if (!email) return { ok: false, email, error: 'Email is required' }

  let invitationId: string | undefined

  try {
    // Persist a pending row up front so even a downstream failure
    // (link generation, send) is observable and retriable.
    invitationId = await upsertInvitation({
      email,
      fullName: payload.fullName?.trim() || null,
      title: payload.title?.trim() || null,
      role: payload.role,
      cohortLetter:
        payload.role === 'fellow' ? payload.cohortLetter ?? null : null,
      invitedBy: invitedByProfileId,
    })

    const { code, otpType, userId, isNewUser } = await generateInviteCode(email, {
      full_name: payload.fullName,
      role: payload.role,
    })
    const loginUrl = await buildLoginUrl(email, otpType)

    if (userId) {
      if (invitationId) await attachUserId(invitationId, userId)
      await applyProfileEnrichment(userId, payload)
    }

    if (!isEmailConfigured()) {
      // We have a code but cannot email it. Mark the invitation as
      // failed (so the admin sees why) and surface the URL in the
      // result so it can be passed along manually.
      if (invitationId) {
        await markInvitationFailed(
          invitationId,
          'RESEND_API_KEY is not set; invite code generated but email not sent',
        )
      }
      return {
        ok: false,
        email,
        invitationId,
        userId,
        actionLink: loginUrl,
        isNewUser,
        error:
          'Email is not configured (RESEND_API_KEY missing). Copy the login link manually.',
      }
    }

    const sendResult = await sendInvitationEmail(email, {
      recipientName: payload.fullName,
      code,
      loginUrl,
      invitedByName: payload.invitedByName,
      cohortLabel: payload.cohortLabel,
      // Supabase OTP TTL defaults to 1 hour. Match it in the copy
      // unless the project later overrides it in the Supabase
      // dashboard.
      expiresAtLabel: '1 hour',
    })

    if (!sendResult.ok) {
      if (invitationId) await markInvitationFailed(invitationId, sendResult.error)
      return {
        ok: false,
        email,
        invitationId,
        userId,
        actionLink: loginUrl,
        isNewUser,
        error: sendResult.error,
      }
    }

    if (invitationId) await markInvitationSent(invitationId, sendResult.id)

    return {
      ok: true,
      email,
      invitationId,
      userId,
      actionLink: loginUrl,
      emailProviderId: sendResult.id,
      isNewUser,
      message: isNewUser ? `Invite sent to ${email}` : `Invite resent to ${email}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown invite error'
    if (invitationId) {
      try {
        await markInvitationFailed(invitationId, message)
      } catch {
        // best-effort - already in error path
      }
    }
    return { ok: false, email, invitationId, error: message }
  }
}
