'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function ContentCleanupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Programme Content</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage phases, labs, activities, and learning content
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Coming soon: Filter content by phase, lab, status, and publication date.
          Archive, unpublish, or delete draft and outdated content.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pending Features</CardTitle>
          <CardDescription>This section will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>View phases, labs, activities, and reflection prompts</li>
            <li>Filter by phase, lab, status, created date, published/unpublished</li>
            <li>Archive, unpublish, delete, or edit content</li>
            <li>Warning if content is linked to reflections or notifications</li>
            <li>Audit log of all content changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
