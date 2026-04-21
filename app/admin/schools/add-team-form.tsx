'use client'

import { useState, useTransition, useId } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Plus } from 'lucide-react'
import { createCohortAction } from './actions'

export function AddTeamForm({
  schoolId,
  defaultName,
}: {
  schoolId: string
  defaultName: string
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [year, setYear] = useState('1')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const nameId = useId()

  const handle = (fd: FormData) => {
    setError(null)
    startTransition(async () => {
      const res = await createCohortAction(fd)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setName(defaultName)
      setYear('1')
      setOpen(false)
    })
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-muted-foreground"
      >
        <Plus className="mr-1 h-4 w-4" />
        Add team
      </Button>
    )
  }

  return (
    <form
      action={handle}
      className="flex flex-col gap-2 rounded-md border border-border bg-muted/30 p-3 md:flex-row md:items-end"
    >
      <input type="hidden" name="schoolId" value={schoolId} />
      <div className="flex flex-1 flex-col gap-1">
        <Label htmlFor={nameId} className="text-xs">
          Team name
        </Label>
        <Input
          id={nameId}
          name="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs">Current year</Label>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Year 1</SelectItem>
            <SelectItem value="2">Year 2</SelectItem>
            <SelectItem value="3">Year 3</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="currentYear" value={year} />
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
