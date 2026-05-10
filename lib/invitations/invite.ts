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
 * Computes the absolute redirect URL Supabase should bounce the
 * invitee to after they click the magic link. Used as the post-OTP
 * `next` step (set-password) on the verify route.
 */
async function buildRedirectTo(): Promise<string | undefined> {
  const origin = await siteUrl('/auth/set-password')
  return origin ?? undefined
}

/**
 * Builds the branded action link the recipient will click in their
 * email. Instead of using Supabase's hosted `action_link` (which
 * routes through `/auth/v1/verify` and does NOT bounce back with a
 * PKCE `?code=` for generateLink-issued tokens, breaking sign-in for
 * @supabase/ssr projects), we point the user at our own
 * `/auth/confirm?token_hash=...&type=...&next=...` route, which calls
 * `supabase.auth.verifyOtp` server-side. This is the documented
 * server-side-PKCE pattern.
 */
async function buildConfirmLink(
  tokenHash: string,
  verificationType: string,
  nextPath = '/auth/set-password',
): Promise<string> {
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: verificationType,
    next: nextPath,
  })
  const url = await siteUrl(`/auth/confirm?${params.toString()}`)
  if (!url) {
    throw new Error(
      'Cannot determine site URL for invitation link. Set NEXT_PUBLIC_SITE_URL.',
    )
  }
  return url
}

/**
 * Generates a one-time confirmation link for the email. Tries
 * `invite` first - which both creates the auth user and returns the
 * link without sending any email. If the user already exists, falls
 * back to a `magiclink` so resending works idempotently.
 */
async function generateActionLink(
  email: string,
  redirectTo: string | undefined,
  metadata: Record<string, unknown>,
): Promise<{
  actionLink: string
  userId: string | undefined
  isNewUser: boolean
}> {
  const admin = createAdminClient()

  const inviteRes = await admin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo, data: metadata },
  })

  const inviteProps = inviteRes.data?.properties
  if (!inviteRes.error && inviteProps?.hashed_token && inviteProps?.verification_type) {
    return {
      actionLink: await buildConfirmLink(
        inviteProps.hashed_token,
        inviteProps.verification_type,
      ),
      userId: inviteRes.data?.user?.id,
      isNewUser: true,
    }
  }

  // User most likely exists - reissue a magic link. This is the
  // resend-invite path.
  const magicRes = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { redirectTo },
  })

  const magicProps = magicRes.data?.properties
  if (magicRes.error || !magicProps?.hashed_token || !magicProps?.verification_type) {
    throw new Error(
      magicRes.error?.message ??
        inviteRes.error?.message ??
        'Could not generate invitation link',
    )
  }

  return {
    actionLink: await buildConfirmLink(
      magicProps.hashed_token,
      magicProps.verification_type,
    ),
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

    const redirectTo = await buildRedirectTo()
    const { actionLink, userId, isNewUser } = await generateActionLink(
      email,
      redirectTo,
      { full_name: payload.fullName, role: payload.role },
    )

    if (userId) {
      if (invitationId) await attachUserId(invitationId, userId)
      await applyProfileEnrichment(userId, payload)
    }

    if (!isEmailConfigured()) {
      // We have a working action_link but cannot email it. Mark the
      // invitation as failed (so the admin sees why) and surface the
      // link in the result so it can be copied manually.
      if (invitationId) {
        await markInvitationFailed(
          invitationId,
          'RESEND_API_KEY is not set; invite link generated but email not sent',
        )
      }
      return {
        ok: false,
        email,
        invitationId,
        userId,
        actionLink,
        isNewUser,
        error:
          'Email is not configured (RESEND_API_KEY missing). Copy the invite link manually.',
      }
    }

    const sendResult = await sendInvitationEmail(email, {
      recipientName: payload.fullName,
      inviteUrl: actionLink,
      invitedByName: payload.invitedByName,
      cohortLabel: payload.cohortLabel,
      expiresAtLabel: 'in 7 days',
    })

    if (!sendResult.ok) {
      if (invitationId) await markInvitationFailed(invitationId, sendResult.error)
      return {
        ok: false,
        email,
        invitationId,
        userId,
        actionLink,
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
      actionLink,
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
