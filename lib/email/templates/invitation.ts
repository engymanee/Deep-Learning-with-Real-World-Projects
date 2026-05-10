import { bodyToHtml, escapeHtml, renderBaseLayout, renderCtaButton } from './base'

export type InvitationEmailArgs = {
  /** Display name to greet the recipient by. Falls back to "there". */
  recipientName?: string | null
  /** The 6-digit code the recipient must enter on the login screen. */
  code: string
  /**
   * URL of the login page with `?email=...&from=invite` pre-filled,
   * so clicking the CTA drops the recipient straight onto the verify
   * step. The code itself is NOT in this URL - it has to be typed.
   */
  loginUrl: string
  /** Optional friendly invite expiry (e.g. "in 1 hour"). */
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
 *
 * Important: this email is intentionally code-based, not link-based.
 * The recipient must visit the portal and type the 6-digit code into
 * the login screen. We deliberately do NOT include a magic link that
 * would auto-sign them in, because the project requires every login -
 * including the very first one after an invite - to go through the
 * same verify-code step.
 */
export function renderInvitationEmail(args: InvitationEmailArgs): RenderedEmail {
  const greeting = args.recipientName?.trim() ? args.recipientName.trim() : 'there'
  const invitedBy = args.invitedByName?.trim()
  const cohort = args.cohortLabel?.trim()
  const expires = args.expiresAtLabel?.trim() || '1 hour'
  const code = String(args.code).trim()

  const subject = "You're invited to the Wisdom at Work portal"

  const intro = invitedBy
    ? `${invitedBy} has invited you to join the Wisdom at Work portal.`
    : `You have been invited to join the Wisdom at Work portal.`

  const cohortLine = cohort ? `You will join as part of ${cohort}.` : ''

  const expiresLine = `This code expires in ${expires}. If it expires, ask the WaW team to resend your invitation.`

  const text = [
    `Hi ${greeting},`,
    '',
    intro,
    cohortLine,
    '',
    'Your one-time sign-in code is:',
    code,
    '',
    `Visit ${args.loginUrl} and enter the code to finish setting up your account.`,
    '',
    expiresLine,
    '',
    "If you weren't expecting this email, you can safely ignore it.",
  ]
    .filter((line) => line !== null)
    .join('\n')

  // Big, monospaced, copy-able code block. Inline styles only - many
  // clients strip <style> blocks.
  const codeBlock = `
    <div style="margin:0 0 24px;padding:20px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb;text-align:center;">
      <p style="margin:0 0 8px;font-size:12px;line-height:1.4;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em;">Your sign-in code</p>
      <p style="margin:0;font-size:32px;line-height:1.2;color:#0f172a;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;letter-spacing:0.4em;font-weight:600;">${escapeHtml(
        code,
      )}</p>
    </div>
  `

  const inner = `
    <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1f2937;">Hi ${escapeHtml(
      greeting,
    )},</p>
    ${bodyToHtml([intro, cohortLine].filter(Boolean).join('\n\n'))}
    ${bodyToHtml('To finish setting up your account, open the portal and enter the 6-digit code below.')}
    ${codeBlock}
    ${renderCtaButton('Open the portal', args.loginUrl)}
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#6b7280;">If the button does not work, copy and paste this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#0f172a;word-break:break-all;"><a href="${escapeHtml(
      args.loginUrl,
    )}" style="color:#0f172a;">${escapeHtml(args.loginUrl)}</a></p>
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
