'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  AnnouncementDialog,
  type ContentOption,
  type FellowOption,
  type SchoolTeamOption,
} from './announcement-dialog'

/**
 * Standalone "New announcement" button + dialog pair.
 *
 * We separated this from the admin page (a Server Component) so the
 * trigger is owned by a small client boundary that fully controls
 * the dialog's open state. Earlier the trigger was passed in via
 * `<DialogTrigger asChild>{trigger}</DialogTrigger>` from the parent;
 * if the dialog body ever failed to compile or hydrate, the trigger
 * itself could be lost. By owning the button here we guarantee it
 * always renders, even if a downstream dialog issue arises.
 *
 * The visual style is intentionally explicit (size="lg", inline
 * Plus icon, `shrink-0`) so the button is unmissable in the page
 * header and never collapses to zero width when the description
 * next to it is long.
 */
export function NewAnnouncementButton({
  schoolTeams,
  fellows,
  contentOptions,
  variant = 'header',
}: {
  schoolTeams: SchoolTeamOption[]
  fellows: FellowOption[]
  contentOptions: ContentOption[]
  /**
   * 'header' renders the primary CTA (size-lg).
   * 'empty'  renders the secondary CTA used inside the empty state.
   */
  variant?: 'header' | 'empty'
}) {
  // Owning open state here means the dialog mounts only when needed,
  // which also keeps initial paint cheap on this page.
  const [open, setOpen] = useState(false)

  const label =
    variant === 'empty' ? 'Create your first announcement' : 'New announcement'

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
        <AnnouncementDialog
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
