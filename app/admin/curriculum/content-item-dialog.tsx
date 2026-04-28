'use client'

import { useState, useTransition, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { CohortAccessField } from '@/components/admin/cohort-access-field'
import {
  CONTENT_CATEGORIES,
  CONTENT_CATEGORY_LABELS,
  CONTENT_RESOURCE_TYPES,
  CONTENT_RESOURCE_TYPE_LABELS,
  type ContentCategory,
  type ContentResourceType,
} from '@/lib/content-types'
import { createContentItem, updateContentItem } from './actions'

export type ContentItemDialogMode = 'create' | 'edit'

interface ContentItemValues {
  id?: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory
  resource_type: ContentResourceType
  /**
   * `null` means the item inherits its phase's cohort gating.
   * Anything else (including `[]`) means the admin has explicitly
   * overridden the gating on this item.
   */
  cohorts: string[] | null
}

interface ContentItemDialogProps {
  mode: ContentItemDialogMode
  yearId: string
  phaseTitle: string
  /** Pre-selected category when creating from inside a category section. */
  defaultCategory?: ContentCategory
  initial?: ContentItemValues
  trigger: ReactNode
}

const EMPTY: ContentItemValues = {
  title: '',
  description: '',
  body: '',
  url: '',
  category: 'before_lab',
  resource_type: 'reading',
  cohorts: null,
}

/**
 * Universal create/edit dialog for content items. Lives next to the
 * server actions so the form fields and the action contract stay in
 * lockstep. Cohort gating uses the new "inherit | override" toggle to
 * surface the new fellow-only access model.
 */
export function ContentItemDialog({
  mode,
  yearId,
  phaseTitle,
  defaultCategory,
  initial,
  trigger,
}: ContentItemDialogProps) {
  const seed: ContentItemValues = {
    ...EMPTY,
    ...(initial ?? {}),
    category: initial?.category ?? defaultCategory ?? EMPTY.category,
  }

  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Local state for inputs that drive other UI (controlled selects,
  // cohort-mode radios). Plain text fields use uncontrolled inputs and
  // their values are read from the FormData on submit.
  const [category, setCategory] = useState<ContentCategory>(seed.category)
  const [resourceType, setResourceType] = useState<ContentResourceType>(
    seed.resource_type,
  )
  const [cohortMode, setCohortMode] = useState<'inherit' | 'override'>(
    seed.cohorts === null ? 'inherit' : 'override',
  )

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('year_id', yearId)
    fd.set('category', category)
    fd.set('resource_type', resourceType)
    fd.set('cohort_mode', cohortMode)
    if (mode === 'edit' && seed.id) fd.set('id', seed.id)

    startTransition(async () => {
      const r =
        mode === 'edit'
          ? await updateContentItem(fd)
          : await createContentItem(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          setOpen(false)
          setMsg(null)
        }, 600)
      } else {
        setMsg({ type: 'err', text: r.message })
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) {
          setMsg(null)
          // Reset controlled state to whatever we were initialized with
          // so the next open of an "edit" dialog doesn't leak the
          // previous edit's intermediate state.
          setCategory(seed.category)
          setResourceType(seed.resource_type)
          setCohortMode(seed.cohorts === null ? 'inherit' : 'override')
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'edit' ? 'Edit content' : 'Add content'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit'
              ? `Editing inside ${phaseTitle}.`
              : `Adding to ${phaseTitle}.`}
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit}>
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ci-category">Category</FieldLabel>
                <Select
                  value={category}
                  onValueChange={(v) => setCategory(v as ContentCategory)}
                >
                  <SelectTrigger id="ci-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CONTENT_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Where this content lives inside the phase.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel htmlFor="ci-resource">Resource type</FieldLabel>
                <Select
                  value={resourceType}
                  onValueChange={(v) =>
                    setResourceType(v as ContentResourceType)
                  }
                >
                  <SelectTrigger id="ci-resource">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_RESOURCE_TYPES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {CONTENT_RESOURCE_TYPE_LABELS[r]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>How fellows consume it.</FieldDescription>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="ci-title">Title</FieldLabel>
              <Input
                id="ci-title"
                name="title"
                required
                defaultValue={seed.title}
                placeholder="e.g. Chapter 1 - Why we lead"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ci-description">Description (optional)</FieldLabel>
              <Input
                id="ci-description"
                name="description"
                defaultValue={seed.description ?? ''}
                placeholder="Short one-liner shown in the phase view"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="ci-url">URL (optional)</FieldLabel>
              <Input
                id="ci-url"
                name="url"
                type="url"
                defaultValue={seed.url ?? ''}
                placeholder="https://..."
              />
              <FieldDescription>
                Direct link to the reading, video, slide deck, or external
                resource. Fellows open it from the phase view.
              </FieldDescription>
            </Field>

            <Field>
              <FieldLabel htmlFor="ci-body">Body (optional)</FieldLabel>
              <Textarea
                id="ci-body"
                name="body"
                rows={4}
                defaultValue={seed.body ?? ''}
                placeholder="Inline copy fellows see directly under the title - prompts, instructions, framing, etc."
              />
            </Field>

            <fieldset className="rounded-md border border-border p-4">
              <legend className="px-1 text-sm font-medium">
                Cohort access
              </legend>
              <div className="flex flex-col gap-3">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="cohort_mode_radio"
                    value="inherit"
                    checked={cohortMode === 'inherit'}
                    onChange={() => setCohortMode('inherit')}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Inherit from phase</span>
                    <span className="block text-xs text-muted-foreground">
                      Show this item to whichever cohorts the phase itself is
                      assigned to. Recommended unless you need a different rule
                      for this single item.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="radio"
                    name="cohort_mode_radio"
                    value="override"
                    checked={cohortMode === 'override'}
                    onChange={() => setCohortMode('override')}
                    className="mt-1"
                  />
                  <span>
                    <span className="font-medium">Override</span>
                    <span className="block text-xs text-muted-foreground">
                      Pick the exact cohorts that can see this item. Leaving
                      every box unchecked locks the item from every fellow.
                    </span>
                  </span>
                </label>

                {cohortMode === 'override' && (
                  <div className="pl-6">
                    <CohortAccessField
                      defaultValue={seed.cohorts ?? []}
                      idPrefix={`ci-cohort-${seed.id ?? 'new'}`}
                      label="Visible to"
                      description="Only fellows in the ticked cohorts will see this item. Unticking everything hides it."
                    />
                  </div>
                )}
              </div>
            </fieldset>

            {msg && (
              <p
                role="status"
                className={
                  msg.type === 'ok'
                    ? 'text-sm text-emerald-600'
                    : 'text-sm text-destructive'
                }
              >
                {msg.text}
              </p>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              {mode === 'edit' ? 'Save changes' : 'Add content'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
