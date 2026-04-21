'use client'

import { useState, useTransition, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Plus } from 'lucide-react'
import { createSchoolAction } from './actions'

export function AddSchoolForm() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const inputId = useId()

  const handle = (fd: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await createSchoolAction(fd)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setName('')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add school
      </Button>
    )
  }

  return (
    <form
      action={handle}
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 md:flex-row md:items-end"
    >
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={inputId} className="text-xs">
          School name
        </Label>
        <Input
          id={inputId}
          name="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Westside Prep"
          required
        />
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
          {isPending ? <Spinner className="mr-1 h-3 w-3" /> : null}
          Create
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setOpen(false)
            setError(null)
            setName('')
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p className="text-xs text-destructive md:ml-3" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
