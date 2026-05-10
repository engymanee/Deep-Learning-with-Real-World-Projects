/**
 * Shared types for the unified notifications system. The DB-side
 * shape is the source of truth (table: public.notifications); these
 * types mirror it so the rest of the app does not need to import
 * Supabase-generated types.
 */

export type NotificationKind = 'announcement' | 'reminder' | 'alert'

export const NOTIFICATION_KINDS: readonly NotificationKind[] = [
  'announcement',
  'reminder',
  'alert',
] as const

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  announcement: 'Announcement',
  reminder: 'Reminder',
  alert: 'Alert',
}

export type NotificationStatus =
  | 'draft'
  | 'scheduled'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'cancelled'

export const NOTIFICATION_STATUSES: readonly NotificationStatus[] = [
  'draft',
  'scheduled',
  'sending',
  'sent',
  'failed',
  'cancelled',
] as const

/**
 * `year` is a legacy scope from the original announcements schema and
 * is kept readable but is not selectable in any new UI. New rows use
 * one of the four supported scopes.
 */
export type AudienceScope =
  | 'global'
  | 'cohort'
  | 'school_team'
  | 'users'
  | 'year'

export type EmailDispatchStatus = 'pending' | 'skipped' | 'sent' | 'failed'

/**
 * Row shape we read from the notifications table for admin and feed
 * surfaces. Mirrors the columns in the unified table after migration
 * 046_notifications_unify.sql.
 */
export interface NotificationRow {
  id: string
  kind: NotificationKind
  status: NotificationStatus
  title: string
  body: string
  pinned: boolean
  audience_scope: AudienceScope
  cohort_codes: string[] | null
  school_team_ids: string[] | null
  user_ids: string[] | null
  year_id: string | null
  cohort_id: string | null
  content_id: string | null
  lab_id: string | null
  module_id: string | null
  session_id: string | null
  cta_label: string | null
  cta_url: string | null
  email_enabled: boolean
  email_subject: string | null
  scheduled_for: string | null
  sent_at: string | null
  published_at: string | null
  created_at: string
  updated_at: string | null
  author_id: string | null
}

/**
 * Per-user feed item. Same as a notification row, plus the recipient's
 * read state (if any). `read_at` is null for unread items - including
 * legacy announcements that pre-date the recipient table.
 */
export interface NotificationFeedItem extends NotificationRow {
  read_at: string | null
  recipient_id: string | null
}
