'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { CohortBadge } from '@/components/admin/cohort-access-field'
import { getResourceType } from '@/lib/curriculum'
import type { ContentRow } from './page'
import { ContentItemForm } from './content-item-form'
import { deleteContent } from '../../../actions'

interface Props {
  phaseId: string
  moduleId: string
  /** Raw module override; null means "inherit from phase". */
  moduleCohorts: string[] | null
  /** Pre-resolved cohort list a content item inherits when its own override is null. */
  moduleEffectiveCohorts: string[]
  items: ContentRow[]
}

/**
 * Flat list of every content item in a module.
 *
 * Mirrors the previous phase-scoped list: a single ordered stream
 * with one "Add content" button at the top. Cohort inheritance is
 * now resolved through the module rather than the phase.
 */
export function ContentList({
  phaseId,
  moduleId,
  moduleCohorts,
  moduleEffectiveCohorts,
  items,
}: Props) {
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-5">
        <div>
          <h3 className="font-serif text-lg text-foreground">Content</h3>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            Every piece of fellow-facing content in this module, in display
            order.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4" />
              Add content
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add content</DialogTitle>
              <DialogDescription>
                Create a new content item in this module.
              </DialogDescription>
            </DialogHeader>
            <ContentItemForm
              phaseId={phaseId}
              moduleId={moduleId}
              moduleCohorts={moduleCohorts}
              moduleEffectiveCohorts={moduleEffectiveCohorts}
              onSaved={() => setCreateOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </header>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-muted-foreground">
          No content yet. Click &ldquo;Add content&rdquo; to create the first
          item.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <ContentRowItem
              key={item.id}
              item={item}
              phaseId={phaseId}
              moduleId={moduleId}
              moduleCohorts={moduleCohorts}
              moduleEffectiveCohorts={moduleEffectiveCohorts}
            />
          ))}
        </ul>
      )}
    </section>
  )
}

function ContentRowItem({
  item,
  phaseId,
  moduleId,
  moduleCohorts,
  moduleEffectiveCohorts,
}: {
  item: ContentRow
  phaseId: string
  moduleId: string
  moduleCohorts: string[] | null
  moduleEffectiveCohorts: string[]
}) {
  const router = useRouter()
  const [editOpen, setEditOpen] = useState(false)
  const [deleting, startDelete] = useTransition()
  const resource = getResourceType(item.resource_type)
  const inherits = item.cohorts === null

  function onDelete() {
    const fd = new FormData()
    fd.set('id', item.id)
    fd.set('phase_id', phaseId)
    fd.set('module_id', moduleId)
    startDelete(async () => {
      const res = await deleteContent(fd)
      if (res.ok) router.refresh()
    })
  }

  return (
    <li className="flex flex-wrap items-start gap-3 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {resource.label}
          </span>
          {inherits ? (
            <span
              className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              title="Inherits cohort access from the module"
            >
              Inherits module
            </span>
          ) : (
            <CohortBadge cohorts={item.cohorts} />
          )}
        </div>
        <p className="mt-1 font-medium text-foreground">{item.title}</p>
        {item.description && (
          <p className="mt-0.5 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
            {item.description}
          </p>
        )}
        {(item.url || item.body) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {item.url && (
              <span className="inline-flex items-center gap-1">
                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                Link attached
              </span>
            )}
            {item.body && (
              <span className="inline-flex items-center gap-1">
                <FileText className="h-3 w-3" aria-hidden="true" />
                Body content
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Edit content">
              <Pencil className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit content</DialogTitle>
              <DialogDescription>
                Update this content item. Changes are visible to fellows
                immediately.
              </DialogDescription>
            </DialogHeader>
            <ContentItemForm
              phaseId={phaseId}
              moduleId={moduleId}
              moduleCohorts={moduleCohorts}
              moduleEffectiveCohorts={moduleEffectiveCohorts}
              initial={{
                id: item.id,
                category: item.category,
                resource_type: item.resource_type,
                title: item.title,
                description: item.description ?? '',
                body: item.body ?? '',
                url: item.url ?? '',
                cohorts: item.cohorts,
              }}
              onSaved={() => setEditOpen(false)}
            />
            <DialogFooter className="mt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-destructive"
              aria-label="Delete content"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this content item?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove &ldquo;{item.title}&rdquo; from
                this module.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={deleting}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </li>
  )
}
