'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Plus } from 'lucide-react'
import { addMemberAction } from './actions'

export interface AvailableFellow {
  id: string
  label: string
}

export function AddMemberForm({
  cohortId,
  fellows,
}: {
  cohortId: string
  fellows: AvailableFellow[]
}) {
  const [profileId, setProfileId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (fellows.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No unassigned fellows. Invite someone from the Users page.
      </p>
    )
  }

  const handle = () => {
    if (!profileId) return
    setError(null)
    const fd = new FormData()
    fd.set('cohortId', cohortId)
    fd.set('profileId', profileId)
    startTransition(async () => {
      const res = await addMemberAction(fd)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setProfileId('')
    })
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <Select value={profileId} onValueChange={setProfileId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Choose a fellow to add" />
          </SelectTrigger>
          <SelectContent>
            {fellows.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="sm"
          onClick={handle}
          disabled={isPending || !profileId}
        >
          {isPending ? (
            <Spinner className="mr-1 h-3 w-3" />
          ) : (
            <Plus className="mr-1 h-4 w-4" />
          )}
          Add
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
