import { redirect } from 'next/navigation'

/**
 * The dedicated /admin/announcements surface has been folded into the
 * unified /admin/notifications page. Anyone landing here from a stale
 * link or bookmark gets a permanent redirect.
 */
export default function AdminAnnouncementsRedirect() {
  redirect('/admin/notifications')
}
