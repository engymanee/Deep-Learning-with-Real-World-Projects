import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { PortalMaintenanceSummary } from '@/components/admin/maintenance/summary-dashboard'
import { MaintenanceClient } from '@/components/admin/maintenance/maintenance-client'

export const metadata = {
  title: 'Portal Maintenance | Admin',
  description: 'Clean up test, duplicate, or unused content before launch',
}

export default async function PortalMaintenancePage() {
  await requireAdmin()
  const supabase = await createClient()

  // Fetch summary statistics for dashboard
  const [
    { count: pendingInvites },
    { count: testUsers },
    { count: draftContent },
    { count: unassignedResources },
    { count: scheduledNotifications },
    { count: communityPosts },
    { count: customPages },
  ] = await Promise.all([
    supabase
      .from('user_invitations')
      .select('*', { count: 'exact', head: true })
      .eq('accepted_at', null),
    supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('deactivated_at', null)
      .like('email', '%@test%'),
    supabase
      .from('labs')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', false),
    supabase
      .from('library_resources')
      .select('*', { count: 'exact', head: true })
      .is('cohort_code', null),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'scheduled'),
    supabase
      .from('community_posts')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('custom_pages')
      .select('*', { count: 'exact', head: true }),
  ])

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section>
        <h1 className="text-balance font-serif text-4xl text-foreground">
          Portal Maintenance
        </h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Clean up test data, duplicate content, and unused resources before launch. All
          actions are logged for accountability.
        </p>
      </section>

      {/* Safety Warning */}
      <Alert variant="destructive" className="border-orange-200 bg-orange-50">
        <AlertTriangle className="h-4 w-4 text-orange-600" />
        <AlertDescription className="text-orange-900">
          Use caution when deleting content. Archive or unpublish instead where possible.
          All actions are permanently logged and cannot be undone.
        </AlertDescription>
      </Alert>

      {/* Summary Dashboard */}
      <PortalMaintenanceSummary
        stats={{
          pendingInvites: pendingInvites || 0,
          testUsers: testUsers || 0,
          draftContent: draftContent || 0,
          unassignedResources: unassignedResources || 0,
          scheduledNotifications: scheduledNotifications || 0,
          communityPosts: communityPosts || 0,
          customPages: customPages || 0,
        }}
      />

      {/* Card-based Navigation and Content */}
      <MaintenanceClient />
    </div>
  )
}
