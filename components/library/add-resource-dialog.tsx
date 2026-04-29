'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { ImagePlus, Plus, Upload, X } from 'lucide-react'
import { addLibraryResource } from '@/app/resources/actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { COHORTS, type Cohort } from '@/lib/cohorts'
// Pulled from a leaf module - importing this from library-view
// would create a cycle (library-view itself imports this file),
// which throws a TDZ ReferenceError when Next.js evaluates the
// dialog module first.
import { PWF_PROTOCOLS_LABEL } from '@/lib/library/labels'
import type { ReactNode } from 'react'

// Order + labels match the user-visible filter pills on the Library
// page. The underlying enum values (`document` / `link` / `video` /
// `reading`) stay the same so the DB / CHECK constraint doesn't move.
const TYPE_OPTIONS: ReadonlyArray<{
  value: 'document' | 'link' | 'video' | 'reading'
  label: ReactNode
}> = [
  { value: 'document', label: PWF_PROTOCOLS_LABEL },
  { value: 'link',     label: 'Field Guides' },
  { value: 'video',    label: 'Video' },
  { value: 'reading',  label: 'Readings' },
]

type ResourceType = (typeof TYPE_OPTIONS)[number]['value']
type Visibility = 'cohort' | 'universal'

const MAX_TAGS = 8
/** Mirror server validation so users get instant feedback. */
const MAX_COVER_BYTES = 5 * 1024 * 1024
const COVER_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif'

/**
 * Admin / facilitator-only entry point for publishing a new Library
 * resource. Lives next to the Library header so curation happens in
 * place - no context switch to /admin.
 *
 * Visibility model mirrors the spec:
 *  - "Further Reading" -> isUniversal=true, lands on the universal
 *    tab and is visible to everyone.
 *  - "Cohort-gated"    -> isUniversal=false, plus an A/B/C multi-
 *    select. Cumulative access (a fellow in B sees A + B) is applied
 *    by the page based on the selected cohorts.
 */
export function AddResourceDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // One state object per field, plus a tags array we manage manually
  // because shadcn doesn't ship a tag input. Keeping each piece
  // separate lets us validate inline without a form library.
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [resourceType, setResourceType] = useState<ResourceType>('document')
  const [visibility, setVisibility] = useState<Visibility>('cohort')
  // Default to the earliest cohort so the form has a valid state on
  // open without forcing a click. Most newly-published material is
  // released for the current cohort first anyway.
  const [cohorts, setCohorts] = useState<Cohort[]>([COHORTS[0]])
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Cover image: keep the actual File for upload + a transient
  // object URL for the preview. The object URL has to be revoked on
  // unmount / replacement so we don't leak memory.
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const coverInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!coverFile) {
      setCoverPreview(null)
      return
    }
    const objectUrl = URL.createObjectURL(coverFile)
    setCoverPreview(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [coverFile])

  function reset() {
    setTitle('')
    setDescription('')
    setUrl('')
    setResourceType('document')
    setVisibility('cohort')
    setCohorts([COHORTS[0]])
    setTags([])
    setTagDraft('')
    setError(null)
    setCoverFile(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  function handleCoverPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) {
      setCoverFile(null)
      return
    }
    // Mirror server-side validation so the user doesn't wait for a
    // round trip just to learn their image is too big.
    if (!file.type.startsWith('image/')) {
      setError('Cover image must be a PNG, JPEG, WebP, or GIF.')
      e.target.value = ''
      return
    }
    if (file.size > MAX_COVER_BYTES) {
      setError('Cover image must be 5 MB or smaller.')
      e.target.value = ''
      return
    }
    setError(null)
    setCoverFile(file)
  }

  function clearCover() {
    setCoverFile(null)
    if (coverInputRef.current) coverInputRef.current.value = ''
  }

  function commitTagDraft() {
    const t = tagDraft.trim()
    if (!t) return
    if (tags.length >= MAX_TAGS) {
      setTagDraft('')
      return
    }
    // Case-insensitive dedupe so "Equity" and "equity" don't both
    // land. Display the new variant only when nothing matches.
    const key = t.toLowerCase()
    if (tags.some((existing) => existing.toLowerCase() === key)) {
      setTagDraft('')
      return
    }
    setTags((prev) => [...prev, t])
    setTagDraft('')
  }

  function removeTag(target: string) {
    setTags((prev) => prev.filter((t) => t !== target))
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    // Enter and comma both commit. Backspace on an empty draft
    // peels off the most recent tag (standard tag-input ergonomic).
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      commitTagDraft()
    } else if (e.key === 'Backspace' && tagDraft === '' && tags.length > 0) {
      e.preventDefault()
      setTags((prev) => prev.slice(0, -1))
    }
  }

  function toggleCohort(c: Cohort) {
    setCohorts((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c],
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Mirror the server's required-field rules so the user gets
    // instant feedback instead of a round trip.
    if (!title.trim()) return setError('Title is required.')
    if (!url.trim()) return setError('URL is required.')
    if (visibility === 'cohort' && cohorts.length === 0) {
      return setError('Pick at least one cohort or switch to Recommended Reading.')
    }

    // Capture any in-flight tag draft so users don't lose it to
    // muscle memory ("I typed it, why isn't it saving?").
    const finalTags =
      tagDraft.trim() &&
      !tags.some((t) => t.toLowerCase() === tagDraft.trim().toLowerCase())
        ? [...tags, tagDraft.trim()]
        : tags

    startTransition(async () => {
      const result = await addLibraryResource({
        title: title.trim(),
        description: description.trim() || null,
        url: url.trim(),
        resourceType,
        tags: finalTags,
        isUniversal: visibility === 'universal',
        cohorts: visibility === 'cohort' ? cohorts : [],
        coverFile: coverFile ?? null,
      })
      if (!result.ok) {
        setError(result.message)
        return
      }
      reset()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button className="inline-flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          Add resource
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add to library</DialogTitle>
          <DialogDescription>
            Publish a curated resource. Choose Recommended Reading for
            materials everyone should see, or Cohort-gated to stage releases
            by cohort.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-title">Title</Label>
            <Input
              id="library-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              placeholder="e.g. Coaching for equitable outcomes"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-description">
              Description <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="library-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="One or two sentences on what this resource is for."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="library-type">Type</Label>
              <Select
                value={resourceType}
                onValueChange={(v) => setResourceType(v as ResourceType)}
              >
                <SelectTrigger id="library-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="library-url">URL</Label>
              <Input
                id="library-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
                type="url"
                placeholder="https://..."
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            File uploads (PDF, MP4) are coming soon. Paste a link for now.
          </p>

          {/* Cover image. Optional - if omitted, the card on the
              Library page falls back to a type-icon panel. */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-cover">
              Cover image{' '}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <input
              ref={coverInputRef}
              id="library-cover"
              type="file"
              accept={COVER_ACCEPT}
              onChange={handleCoverPick}
              className="sr-only"
            />
            {coverPreview ? (
              <div className="flex items-start gap-3">
                <div className="relative h-24 w-40 shrink-0 overflow-hidden rounded-md border border-border bg-muted">
                  <Image
                    src={coverPreview}
                    alt="Selected cover preview"
                    fill
                    sizes="160px"
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-muted-foreground">
                    {coverFile?.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => coverInputRef.current?.click()}
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Replace
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearCover}
                    >
                      <X className="h-3.5 w-3.5" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                className="flex items-center gap-3 rounded-md border border-dashed border-border bg-muted/40 p-4 text-left transition-colors hover:border-primary/60 hover:bg-muted"
              >
                <span className="grid h-10 w-10 place-items-center rounded-md bg-background text-muted-foreground">
                  <ImagePlus className="h-5 w-5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Upload a cover image
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG, JPEG, WebP, or GIF. Up to 5 MB.
                  </span>
                </span>
              </button>
            )}
          </div>

          {/* Visibility radio + (conditional) cohort multi-select.
              The cohort row collapses when "Further reading" is
              picked so the form doesn't ask irrelevant questions. */}
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-foreground">
              Visibility
            </legend>
            <RadioGroup
              value={visibility}
              onValueChange={(v) => setVisibility(v as Visibility)}
              className="flex flex-col gap-2"
            >
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="cohort" id="vis-cohort" className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Cohort-gated
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Released by stage. Fellows see everything assigned to their
                    cohort and earlier ones.
                  </span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-3 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5">
                <RadioGroupItem value="universal" id="vis-universal" className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">
                    Recommended reading
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Visible to everyone, regardless of cohort. Lands on the
                    Recommended Reading tab.
                  </span>
                </span>
              </label>
            </RadioGroup>
          </fieldset>

          {visibility === 'cohort' && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-foreground">
                Cohorts
              </span>
              <div className="flex flex-wrap gap-2">
                {COHORTS.map((c) => {
                  const checked = cohorts.includes(c)
                  return (
                    <label
                      key={c}
                      htmlFor={`cohort-${c}`}
                      className={
                        'inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ' +
                        (checked
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-card text-muted-foreground hover:bg-muted')
                      }
                    >
                      <Checkbox
                        id={`cohort-${c}`}
                        checked={checked}
                        onCheckedChange={() => toggleCohort(c)}
                      />
                      Cohort {c}
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Pick the earliest cohort the resource should be released for. A
                fellow in B will see anything tagged A or B.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="library-tag-input">
              Tags <span className="text-muted-foreground">(optional)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5">
              {tags.map((t) => (
                <Badge
                  key={t}
                  variant="secondary"
                  className="gap-1 text-xs"
                >
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="rounded-full p-0.5 hover:bg-background/60"
                    aria-label={`Remove tag ${t}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              <input
                id="library-tag-input"
                value={tagDraft}
                onChange={(e) => setTagDraft(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={commitTagDraft}
                placeholder={
                  tags.length === 0
                    ? 'Press Enter to add a tag'
                    : tags.length >= MAX_TAGS
                      ? 'Tag limit reached'
                      : ''
                }
                disabled={tags.length >= MAX_TAGS}
                className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Up to {MAX_TAGS} tags. Press Enter or comma after each.
            </p>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Publishing...' : 'Publish'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
