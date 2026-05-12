'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function LibraryCleanupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Library Resources</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage My Resources and Recommended Resources
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Coming soon: Filter resources by category, type, cohort assignment, and status.
          Identify and clean up unassigned or duplicate resources.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pending Features</CardTitle>
          <CardDescription>This section will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>View My Resources and Recommended Resources</li>
            <li>Filter by category, type, cohort, created date, published status</li>
            <li>Identify unassigned resources, duplicates, missing metadata, broken links</li>
            <li>Archive, delete, restore, or edit resources</li>
            <li>Audit log of all resource changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
