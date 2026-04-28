'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { addLibraryResource } from '@/app/resources/actions'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

const TYPE_OPTIONS = [
  { value: 'document', label: 'Document' },
  { value: 'video', label: 'Video' },
  { value: 'reading', label: 'Reading' },
  { value: 'link', label: 'Link' },
] as const

const COHORT_OPTIONS = [
  { value: 'all', label: 'All cohorts' },
  { value: 'A', label: 'Cohort A' },
  { value: 'B', label: 'Cohort B' },
] as const

type ResourceType = (typeof TYPE_OPTIONS)[number]['value']
type CohortChoice = (typeof COHORT_OPTIONS)[number]['value']

const MAX_TAGS = 8

/**
 * Admin / facilitator-only entry point for publishing a new Library
 * resource. Lives next to the Library header so curation happens in
 * place - no context switch to /admin. URL-based for now; a later
 * pass can swap the URL field for a Vercel Blob upload widget
 * without changing the action signature.
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
  const [cohort, setCohort] = useState<CohortChoice>('all')
  const [tags, setTags] = useState<string[]>([])
  const [tagDraft, setTagDraft] = useState('')
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setTitle('')
    setDescription('')
    setUrl('')
    setResourceType('document')
    setCohort('all')
    setTags([])
    setTagDraft('')
    setError(null)
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Mirror the server's required-field rules so the user gets
    // instant feedback instead of a round trip.
    if (!title.trim()) return setError('Title is required.')
    if (!url.trim()) return setError('URL is required.')

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
        cohort,
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
            Publish a curated resource. Fellows will see it once the cohort
            assignment matches their own.
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
              <Label htmlFor="library-cohort">Visible to</Label>
              <Select
                value={cohort}
                onValueChange={(v) => setCohort(v as CohortChoice)}
              >
                <SelectTrigger id="library-cohort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COHORT_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            <p className="text-xs text-muted-foreground">
              File uploads (PDF, MP4) are coming soon. Paste a link for now.
            </p>
          </div>

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
