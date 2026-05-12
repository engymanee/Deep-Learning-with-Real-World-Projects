'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function NotificationsCleanupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Notifications</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage announcements, reminders, alerts, and email logs
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Coming soon: Filter notifications by status, audience, date, and type.
          Cancel scheduled test notifications and archive old sent items.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pending Features</CardTitle>
          <CardDescription>This section will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>View announcements, reminders, alerts, scheduled notifications, email logs</li>
            <li>Filter by status, audience, date, kind (announcement/reminder/alert)</li>
            <li>Cancel scheduled test notifications</li>
            <li>Delete drafts and archive old sent notifications</li>
            <li>Clear failed email test logs</li>
            <li>Audit log of all notification changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
