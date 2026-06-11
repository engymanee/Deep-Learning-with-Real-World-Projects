'use client'

import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FlexiblePageEditor } from '@/components/admin/flexible-page-editor'
import { getAdminPageContent } from '@/app/admin/actions'

export default async function AdminAboutPage() {
  const bodyContent = await getAdminPageContent('about', 'body')

  return (
    <AdminAboutClient
      bodyItems={bodyContent.ok ? bodyContent.data : []}
    />
  )
}

function AdminAboutClient({ bodyItems }: { bodyItems: any[] }) {
  const [isEditing, setIsEditing] = useState(true)

  return (
    <div className="flex flex-col gap-6">
      {/* Header with back button and edit toggle */}
      <div className="flex items-center justify-between border-b border-border pb-6">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-foreground">About Page</h1>
            <p className="text-sm text-muted-foreground">
              Manage editable content blocks on the public about page
            </p>
          </div>
        </div>
        <Button
          variant={isEditing ? 'default' : 'outline'}
          onClick={() => setIsEditing(!isEditing)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {isEditing ? 'Done' : 'Edit'}
        </Button>
      </div>

      {/* Main content section with flexible editor */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground mb-4">Page Content</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Add, edit, and reorder content blocks (text, images, or both) that appear in the main body of the about page. Drag blocks to rearrange them.
        </p>
        <FlexiblePageEditor
          pageId="about"
          slotName="body"
          items={bodyItems}
          isEditMode={isEditing}
        />
      </section>
    </div>
  )
}
