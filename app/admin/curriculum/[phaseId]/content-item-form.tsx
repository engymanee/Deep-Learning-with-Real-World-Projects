'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CohortAccessField } from '@/components/admin/cohort-access-field'
import {
  CONTENT_CATEGORIES,
  RESOURCE_TYPES,
  type ContentCategory,
  type ResourceType,
} from '@/lib/curriculum'
import { COHORTS } from '@/lib/cohorts'
import { createContent, updateContent } from '../actions'

export interface ContentItemDraft {
  id?: string
  category: ContentCategory
  resource_type: ResourceType
  title: string
  description: string
  body: string
  url: string
  /**
   * `null`  -> inherit from the phase
   * `[]`    -> locked (no fellows)
   * `[...]` -> override with this exact list
   */
  cohorts: string[] | null
}

interface Props {
  phaseId: string
  phaseCohorts: string[]
  /** When supplied this is an edit; when omitted it's a fresh create. */
  initial?: ContentItemDraft
  /** Pre-fill category for the create flow. */
  defaultCategory?: ContentCategory
  onSaved?: () => void
}

export function ContentItemForm({
  phaseId,
  phaseCohorts,
  initial,
  defaultCategory,
  onSaved,
}: Props) {
  const router = useRouter()
  const isEdit = !!initial?.id
  const titleId = useId()
  const descId = useId()
  const bodyId = useId()
  const urlId = useId()

  const [category, setCategory] = useState<ContentCategory>(
    initial?.category ?? defaultCategory ?? CONTENT_CATEGORIES[0].value,
  )
  const [resourceType, setResourceType] = useState<ResourceType>(
    initial?.resource_type ?? 'reading',
  )
  // Default new items to "inherit"; for edits, use whatever the row stored.
  const [inherit, setInherit] = useState<boolean>(
    initial ? initial.cohorts === null : true,
  )
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    formData.set('year_id', phaseId)
    formData.set('category', category)
    formData.set('resource_type', resourceType)
    if (inherit) formData.set('cohorts_inherit', 'on')
    if (isEdit) formData.set('id', initial!.id!)

    startTransition(async () => {
      const res = isEdit
        ? await updateContent(formData)
        : await createContent(formData)
      if (!res.ok) {
        setError(res.message)
        return
      }
      onSaved?.()
      router.refresh()
    })
  }

  return (
    <form action={onSubmit} className="flex flex-col gap-5">
      {/* Category is only chooseable on create. On edit, the previously
          assigned category is preserved silently and never surfaced -
          per the policy that category UI lives only inside the create
          dialog. The value still flows back to the server via the
          formData.set('category', ...) call below. */}
      {!isEdit ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as ContentCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTENT_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Resource type</Label>
            <Select
              value={resourceType}
              onValueChange={(v) => setResourceType(v as ResourceType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Resource type</Label>
          <Select
            value={resourceType}
            onValueChange={(v) => setResourceType(v as ResourceType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOURCE_TYPES.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={titleId}>Title</Label>
        <Input
          id={titleId}
          name="title"
          required
          autoFocus
          defaultValue={initial?.title ?? ''}
          placeholder="e.g. Pre-reading: Foundations of Wisdom"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={descId}>Short description (optional)</Label>
        <Textarea
          id={descId}
          name="description"
          rows={2}
          defaultValue={initial?.description ?? ''}
          placeholder="One or two lines that introduce this content."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={urlId}>Link / URL (optional)</Label>
        <Input
          id={urlId}
          name="url"
          type="url"
          inputMode="url"
          defaultValue={initial?.url ?? ''}
          placeholder="https://..."
        />
        <p className="text-xs text-muted-foreground">
          Use for videos, slide decks, PDFs, surveys, or any link-based
          resource.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={bodyId}>Body (optional)</Label>
        <Textarea
          id={bodyId}
          name="body"
          rows={8}
          defaultValue={initial?.body ?? ''}
          placeholder="Plain-text body shown directly on the content page. Use this for prompts, instructions, or short readings."
        />
      </div>

      <div className="space-y-2 rounded-md border border-border bg-muted/30 p-4">
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={inherit}
            onChange={(e) => setInherit(e.target.checked)}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium text-foreground">
              Inherit cohort access from this phase
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {phaseCohorts.length === 0
                ? 'Phase is currently unassigned, so no fellows can see this content.'
                : `Visible to fellows in ${phaseCohorts
                    .map((c) => `Cohort ${c}`)
                    .join(', ')}.`}
            </span>
          </span>
        </label>
        {!inherit && (
          <div className="pt-2">
            <CohortAccessField
              defaultValue={
                Array.isArray(initial?.cohorts) ? initial!.cohorts! : []
              }
              idPrefix={`content-cohort-${initial?.id ?? 'new'}`}
              label="Override cohort access"
              description="Tick the cohorts that should see this content. Leaving all unchecked hides this item from every fellow even if they can see the phase."
            />
          </div>
        )}
        {/* Always render hidden inputs for non-overridden cohort values
            so getAll('cohorts') yields [] when the user clears them */}
        {COHORTS.length === 0 && null}
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end pt-1">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving...' : isEdit ? 'Save changes' : 'Add content'}
        </Button>
      </div>
    </form>
  )
}
