'use client'

import { useId, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { submitReflection } from '@/app/(curriculum)/phases/actions'

interface Props {
  contentId: string
  prompt: string
  /**
   * The user's previously-submitted response, or `null` when they
   * haven't responded yet. When present, the form starts in a
   * locked "submitted" state with an "Edit" button to re-open it.
   */
  initialResponse: string | null
}

/**
 * Reflection prompt + response form. Required when an item has
 * `reflection_enabled = true`; the fellow can't mark the item
 * complete until they've submitted a non-empty response.
 *
 * Designed to feel like a small journal entry: read-only "submitted"
 * state with an Edit button, expanding into a textarea + Save when
 * the user wants to revise.
 */
export function ReflectionForm({
  contentId,
  prompt,
  initialResponse,
}: Props) {
  const router = useRouter()
  const inputId = useId()
  const [response, setResponse] = useState(initialResponse ?? '')
  const [savedResponse, setSavedResponse] = useState(initialResponse)
  const [editing, setEditing] = useState(initialResponse === null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const value = response.trim()
    if (!value) {
      setError('Please write a short response before saving.')
      return
    }
    startTransition(async () => {
      const res = await submitReflection(contentId, value)
      if (!res.ok) {
        setError(res.message)
        return
      }
      setSavedResponse(value)
      setEditing(false)
      router.refresh()
    })
  }

  return (
    <section className="space-y-3 rounded-lg border border-border bg-card p-5">
      <div className="flex items-start gap-2">
        <Pencil className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Reflection
          </p>
          <p className="text-pretty text-sm leading-relaxed text-foreground">
            {prompt}
          </p>
        </div>
      </div>

      {!editing && savedResponse ? (
        // Submitted state.
        <div className="space-y-3">
          <div className="rounded-md border border-border bg-muted/40 p-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {savedResponse}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              Reflection submitted
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditing(true)
                setResponse(savedResponse)
              }}
            >
              Edit
            </Button>
          </div>
        </div>
      ) : (
        // Edit state.
        <form onSubmit={handleSubmit} className="space-y-2">
          <Label htmlFor={inputId} className="sr-only">
            Your reflection
          </Label>
          <Textarea
            id={inputId}
            rows={5}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write a short response to the prompt above."
            disabled={pending}
          />
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            {savedResponse && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setResponse(savedResponse)
                  setEditing(false)
                  setError(null)
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving...' : savedResponse ? 'Save changes' : 'Submit reflection'}
            </Button>
          </div>
        </form>
      )}
    </section>
  )
}
