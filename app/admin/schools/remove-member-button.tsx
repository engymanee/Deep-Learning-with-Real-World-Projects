'use client'

import { useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { X } from 'lucide-react'
import { removeMemberAction } from './actions'

export function RemoveMemberButton({
  cohortId,
  profileId,
  label,
}: {
  cohortId: string
  profileId: string
  label: string
}) {
  const [isPending, startTransition] = useTransition()

  const handle = () => {
    if (!confirm(`Remove ${label} from this team?`)) return
    const fd = new FormData()
    fd.set('cohortId', cohortId)
    fd.set('profileId', profileId)
    startTransition(async () => {
      await removeMemberAction(fd)
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handle}
      disabled={isPending}
      aria-label={`Remove ${label}`}
      className="h-6 w-6 text-muted-foreground hover:text-destructive"
    >
      {isPending ? <Spinner className="h-3 w-3" /> : <X className="h-3 w-3" />}
    </Button>
  )
}
