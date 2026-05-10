import { bodyToHtml, escapeHtml, renderBaseLayout, renderCtaButton } from './base'

export type InvitationEmailArgs = {
  /** Display name to greet the recipient by. Falls back to "there". */
  recipientName?: string | null
  /** The full magic-link URL the recipient should click to accept. */
  inviteUrl: string
  /** Optional friendly invite expiry (e.g. "in 7 days"). */
  expiresAtLabel?: string | null
  /** Name of the admin who issued the invite, shown in the body. */
  invitedByName?: string | null
  /** Optional cohort name shown in the body to give context. */
  cohortLabel?: string | null
}

export type RenderedEmail = {
  subject: string
  html: string
  text: string
}

/**
 * Renders the invitation email shown to a newly invited fellow.
 * The CTA opens a one-time Supabase magic link that signs them in and
 * routes them to /auth/set-password to choose a password.
 */
export function renderInvitationEmail(args: InvitationEmailArgs): RenderedEmail {
  const greeting = args.recipientName?.trim() ? args.recipientName.trim() : 'there'
  const invitedBy = args.invitedByName?.trim()
  const cohort = args.cohortLabel?.trim()
  const expires = args.expiresAtLabel?.trim()

  const subject = "You're invited to the Wisdom at Work portal"

  const intro = invitedBy
    ? `${invitedBy} has invited you to join the Wisdom at Work portal.`
    : `You have been invited to join the Wisdom at Work portal.`

  const cohortLine = cohort
    ? `You will join as part of ${cohort}.`
    : ''

  const expiresLine = expires
    ? `This invitation expires ${expires}.`
    : 'For security, this invitation link can only be used once.'

  const text = [
    `Hi ${greeting},`,
    '',
    intro,
    cohortLine,
    '',
    'Click the link below to accept your invitation and set your password:',
    args.inviteUrl,
    '',
    expiresLine,
    '',
    "If you weren't expecting this email, you can safely ignore it.",
  ]
    .filter((line) => line !== null)
    .join('\n')

  const inner = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Hi ${escapeHtml(
      greeting,
    )},</p>
    ${bodyToHtml([intro, cohortLine].filter(Boolean).join('\n\n'))}
    ${bodyToHtml('Click the button below to accept your invitation and set up your password.')}
    ${renderCtaButton('Accept invitation', args.inviteUrl)}
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#0f172a;word-break:break-all;"><a href="${escapeHtml(
      args.inviteUrl,
    )}" style="color:#0f172a;">${escapeHtml(args.inviteUrl)}</a></p>
    <p style="margin:0 0 4px;font-size:13px;line-height:1.6;color:#6b7280;">${escapeHtml(
      expiresLine,
    )}</p>
    <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">If you weren&apos;t expecting this email, you can safely ignore it.</p>
  `

  const html = renderBaseLayout(inner, {
    heading: 'Your invitation is ready',
    previewText: subject,
  })

  return { subject, html, text }
}
