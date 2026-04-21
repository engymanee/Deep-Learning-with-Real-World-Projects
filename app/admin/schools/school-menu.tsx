'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { renameSchoolAction, deleteSchoolAction } from './actions'

export function SchoolMenu({
  schoolId,
  initialName,
  memberCount,
}: {
  schoolId: string
  initialName: string
  memberCount: number
}) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(initialName)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleSave = () => {
    setError(null)
    const fd = new FormData()
    fd.set('id', schoolId)
    fd.set('name', name)
    startTransition(async () => {
      const res = await renameSchoolAction(fd)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setOpen(false)
    })
  }

  const handleDelete = () => {
    if (memberCount > 0) {
      alert(`This school still has ${memberCount} member(s). Reassign or remove them first.`)
      return
    }
    if (!confirm('Delete this school? This cannot be undone.')) return
    const fd = new FormData()
    fd.set('id', schoolId)
    startTransition(async () => {
      const res = await deleteSchoolAction(fd)
      if (!res.ok) alert(res.message)
    })
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            aria-label="School options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            Rename school
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete school
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (next) {
            setName(initialName)
            setError(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename school</DialogTitle>
            <DialogDescription>
              The new name will appear everywhere this school is referenced.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="school-name">Name</Label>
            <Input
              id="school-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isPending || !name.trim()}>
              {isPending ? <Spinner className="mr-1 h-3 w-3" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
