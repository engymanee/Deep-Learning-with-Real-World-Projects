export type EmailLogEntry = {
  id: string
  recipient_email: string
  recipient_name: string | null
  subject: string
  email_type: string
  status: 'pending' | 'sent' | 'failed' | 'bounced'
  resend_id: string | null
  error_message: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
  metadata: Record<string, any> | null
}
