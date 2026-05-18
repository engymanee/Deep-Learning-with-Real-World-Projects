'use client'

import { useState, useTransition, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Plus, X } from 'lucide-react'
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
        <Plus className="mr-1.5 h-4 w-4" />
        Add school
      </Button>
    )
  }

  return (
    <form
      action={handle}
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 max-w-md"
    >
      <div className="space-y-1.5">
        <Label htmlFor={inputId} className="text-sm font-medium">
          School name
        </Label>
        <Input
          id={inputId}
          name="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Westside Prep, Lincoln High..."
          required
          className="text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Enter the name of your school or educational institution.
        </p>
      </div>

      {error ? (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button 
          type="submit" 
          size="sm" 
          disabled={isPending || !name.trim()}
          className="flex-1 sm:flex-none"
        >
          {isPending ? <Spinner className="mr-1.5 h-3 w-3" /> : null}
          Create school
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
          <X className="mr-1.5 h-4 w-4" />
          Cancel
        </Button>
      </div>
    </form>
  )
}
