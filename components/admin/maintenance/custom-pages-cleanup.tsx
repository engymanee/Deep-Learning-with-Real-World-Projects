'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export function CustomPagesCleanupSection() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-2xl font-bold text-foreground">Custom Pages</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage custom pages created by admins
        </p>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Coming soon: Filter custom pages by publication status and creation date.
          Edit, archive, delete, or restore custom pages.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Pending Features</CardTitle>
          <CardDescription>This section will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
            <li>View all custom pages created by admins</li>
            <li>Filter by published/unpublished, featured in header, created date</li>
            <li>Edit, archive, delete, or restore custom pages</li>
            <li>Preview pages before deletion</li>
            <li>Audit log of all custom page changes</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
