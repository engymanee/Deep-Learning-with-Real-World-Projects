'use client'

import { AdminPageContentSlot } from '@/components/admin/admin-page-content-slot'

interface AdminPageContentSlotWrapperProps {
  pageId: string
  slotName: string
  items: any[]
  isEditMode?: boolean
  isAdmin?: boolean
}

export function AdminPageContentSlotWrapper({
  pageId,
  slotName,
  items,
  isEditMode = true,
  isAdmin = true,
}: AdminPageContentSlotWrapperProps) {
  return (
    <AdminPageContentSlot
      pageId={pageId}
      slotName={slotName}
      items={items}
      isEditMode={isEditMode}
      isAdmin={isAdmin}
    />
  )
}
