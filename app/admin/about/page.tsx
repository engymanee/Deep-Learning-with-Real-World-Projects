'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { ArrowLeft, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminPageContentSlotWrapper } from '@/components/admin/admin-page-content-slot-wrapper'

type Props = {
  headerItems: any[]
  footerItems: any[]
}

export default async function AdminAboutPage() {
  return (
    <AdminAboutClient headerItems={[]} footerItems={[]} />
  )
}

function AdminAboutClient({ headerItems, footerItems }: Props) {
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
              Manage editable content sections on the public about page
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

      {/* Header section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground mb-4">Header Content</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Add, edit, or reorder text blocks that appear at the top of the about page above the main welcome section.
        </p>
        <AdminPageContentSlotWrapper
          pageId="about"
          slotName="header"
          items={headerItems}
          isEditMode={isEditing}
        />
      </section>

      {/* Footer section */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-serif text-lg text-foreground mb-4">Footer Content</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Add, edit, or reorder text blocks that appear at the bottom of the about page below the foundation attribution.
        </p>
        <AdminPageContentSlotWrapper
          pageId="about"
          slotName="footer"
          items={footerItems}
          isEditMode={isEditing}
        />
      </section>
    </div>
  )
}
