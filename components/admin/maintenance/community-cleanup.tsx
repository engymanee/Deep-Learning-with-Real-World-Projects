'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function CommunityCleanupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Community Content</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage reflections, wins, asks, and community discussions
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Coming soon: Filter community content by fellow, team, cohort, date, and type.
          Carefully manage fellow-generated content with warnings before deletion.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pending Features</CardTitle>
          <CardDescription>This section will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>View Fellow Reflections, comments, Wins & Progress, Ask the Community, replies</li>
            <li>Filter by fellow, school team, cohort, date, type, status</li>
            <li>Hide, archive, delete test entries, or restore content</li>
            <li>Warnings before deleting real fellow-generated content</li>
            <li>Audit log of all community content changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
