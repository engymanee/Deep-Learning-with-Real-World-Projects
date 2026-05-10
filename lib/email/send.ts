import { sendEmail, type SendResult } from './client'
import {
  renderInvitationEmail,
  type InvitationEmailArgs,
} from './templates/invitation'
import {
  renderNotificationEmail,
  type NotificationEmailArgs,
} from './templates/notification'
import {
  renderSignInCodeEmail,
  type SignInCodeEmailArgs,
} from './templates/sign-in-code'

/**
 * High-level wrapper used by invite flows. Renders the branded
 * invitation template and dispatches via Resend, returning a
 * structured result the caller can persist on the invitation row.
 */
export async function sendInvitationEmail(
  to: string,
  args: InvitationEmailArgs,
): Promise<SendResult> {
  const { subject, html, text } = renderInvitationEmail(args)
  return sendEmail({
    to,
    subject,
    html,
    text,
    tags: [{ name: 'category', value: 'invitation' }],
  })
}

/**
 * Sends the "here is your sign-in code" email used by the
 * passwordless login flow. We keep this code-only (no magic link) so
 * the recipient must return to the open login tab and type the digits,
 * which is the explicit UX the admin asked for.
 */
export async function sendSignInCodeEmail(
  to: string,
  args: SignInCodeEmailArgs,
): Promise<SendResult> {
  const { subject, html, text } = renderSignInCodeEmail(args)
  return sendEmail({
    to,
    subject,
    html,
    text,
    tags: [{ name: 'category', value: 'sign-in-code' }],
  })
}

/**
 * High-level wrapper used by the notification dispatcher. One call
 * sends one personalized email; the dispatcher iterates per recipient
 * so we can persist provider IDs and errors per-row.
 */
export async function sendNotificationEmail(
  to: string,
  args: NotificationEmailArgs,
): Promise<SendResult> {
  const { subject, html, text } = renderNotificationEmail(args)
  return sendEmail({
    to,
    subject,
    html,
    text,
    tags: [
      { name: 'category', value: 'notification' },
      { name: 'kind', value: args.kind },
    ],
  })
}
