'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Pencil } from 'lucide-react'
import { FlexiblePageEditor } from '@/components/admin/flexible-page-editor'

interface AdminAboutClientProps {
  pageId: string
  slotName: string
  initialItems: any[]
}

export function AdminAboutClient({
  pageId,
  slotName,
  initialItems,
}: AdminAboutClientProps) {
  const [isEditing, setIsEditing] = useState(true)

  return (
    <div className="space-y-6">
      {/* Edit toggle button */}
      <div className="flex justify-end">
        <Button
          variant={isEditing ? 'default' : 'outline'}
          onClick={() => setIsEditing(!isEditing)}
        >
          <Pencil className="h-4 w-4 mr-2" />
          {isEditing ? 'Done Editing' : 'Edit'}
        </Button>
      </div>

      {/* Content editor */}
      <FlexiblePageEditor
        pageId={pageId}
        slotName={slotName}
        items={initialItems}
        isEditMode={isEditing}
      />
    </div>
  )
}
