'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  NotificationDialog,
  type ContentOption,
  type FellowOption,
  type SchoolTeamOption,
} from './notification-dialog'

/**
 * Self-contained "New notification" button + dialog. Mounting the
 * dialog only when needed keeps the admin list page cheap to paint.
 */
export function NewNotificationButton({
  schoolTeams,
  fellows,
  contentOptions,
  variant = 'header',
}: {
  schoolTeams: SchoolTeamOption[]
  fellows: FellowOption[]
  contentOptions: ContentOption[]
  variant?: 'header' | 'empty'
}) {
  const [open, setOpen] = useState(false)
  const label =
    variant === 'empty'
      ? 'Create your first notification'
      : 'New notification'

  return (
    <>
      <Button
        type="button"
        size={variant === 'header' ? 'lg' : 'default'}
        className="shrink-0"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" aria-hidden />
        {label}
      </Button>
      {open ? (
        <NotificationDialog
          mode="create"
          open={open}
          onOpenChange={setOpen}
          schoolTeams={schoolTeams}
          fellows={fellows}
          contentOptions={contentOptions}
        />
      ) : null}
    </>
  )
}
