'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  createBlock,
  updateBlock,
  type ActionResult,
  type BlockType,
  type Phase,
} from '../../actions'

export type BlockFormValues = {
  id?: string
  lab_id: string
  phase: Phase
  block_type: BlockType
  title: string
  body: string | null
  url: string | null
  duration_minutes: number | null
  is_optional: boolean
  session_id: string | null
}

type SessionOption = { id: string; title: string; starts_at: string | null }

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  reading: 'Reading',
  video: 'Video',
  reflection_prompt: 'Reflection prompt',
  protocol: 'Protocol / tool',
  session_link: 'Live session link',
  slides: 'Slides / handout',
  survey: 'Survey',
  follow_up_task: 'Follow-up task',
}

const PHASE_LABELS: Record<Phase, string> = {
  before: 'Before the lab',
  during: 'During the lab',
  after: 'After the lab',
}

const NONE = '__none__'

export function BlockDialog({
  open,
  onOpenChange,
  mode,
  initial,
  sessions,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  mode: 'create' | 'edit'
  initial: BlockFormValues
  sessions: SessionOption[]
}) {
  const [values, setValues] = useState<BlockFormValues>(initial)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  // Reset state each time the dialog opens so edit-dialog defaults match the row.
  useEffect(() => {
    if (open) {
      setValues(initial)
      setMsg(null)
    }
  }, [open, initial])

  function onSubmit(fd: FormData) {
    setMsg(null)
    fd.set('lab_id', values.lab_id)
    fd.set('phase', values.phase)
    fd.set('block_type', values.block_type)
    fd.set('title', values.title)
    fd.set('body', values.body ?? '')
    fd.set('url', values.url ?? '')
    fd.set('duration_minutes', values.duration_minutes == null ? '' : String(values.duration_minutes))
    fd.set('is_optional', values.is_optional ? 'true' : 'false')
    fd.set('session_id', values.session_id ?? '')
    if (mode === 'edit' && values.id) fd.set('id', values.id)

    startTransition(async () => {
      const r: ActionResult = mode === 'create' ? await createBlock(fd) : await updateBlock(fd)
      if (r.ok) {
        setMsg({ type: 'ok', text: r.message })
        setTimeout(() => {
          onOpenChange(false)
          setMsg(null)
        }, 700)
      } else {
        setMsg({ type: 'err', text: r.message })
      }
    })
  }

  const showSessionPicker = values.block_type === 'session_link' && sessions.length > 0

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setMsg(null)
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add content block' : 'Edit content block'}</DialogTitle>
          <DialogDescription>
            Content blocks make up the lab flow. Fellows see them grouped by phase and can mark each
            one complete.
          </DialogDescription>
        </DialogHeader>

        <form action={onSubmit}>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel>Phase</FieldLabel>
                <Select
                  value={values.phase}
                  onValueChange={(v) => setValues({ ...values, phase: v as Phase })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PHASE_LABELS) as Phase[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PHASE_LABELS[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel>Type</FieldLabel>
                <Select
                  value={values.block_type}
                  onValueChange={(v) => setValues({ ...values, block_type: v as BlockType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BLOCK_TYPE_LABELS) as BlockType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {BLOCK_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field>
              <FieldLabel htmlFor="block-title">Title</FieldLabel>
              <Input
                id="block-title"
                value={values.title}
                onChange={(e) => setValues({ ...values, title: e.target.value })}
                required
                placeholder="e.g. Read: What does it mean to take someone seriously?"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="block-body">Body / instructions</FieldLabel>
              <Textarea
                id="block-body"
                rows={4}
                value={values.body ?? ''}
                onChange={(e) => setValues({ ...values, body: e.target.value })}
                placeholder="Short description, instructions, or framing shown under the title."
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="block-url">Link URL</FieldLabel>
                <Input
                  id="block-url"
                  type="url"
                  value={values.url ?? ''}
                  onChange={(e) => setValues({ ...values, url: e.target.value })}
                  placeholder="https://..."
                />
                <FieldDescription>
                  Zoom link, article URL, YouTube, survey - whatever opens when fellows click through.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="block-duration">Duration (min)</FieldLabel>
                <Input
                  id="block-duration"
                  type="number"
                  min={0}
                  value={values.duration_minutes ?? ''}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      duration_minutes: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                  placeholder="15"
                />
              </Field>
            </div>

            {showSessionPicker && (
              <Field>
                <FieldLabel>Linked session</FieldLabel>
                <Select
                  value={values.session_id ?? NONE}
                  onValueChange={(v) => setValues({ ...values, session_id: v === NONE ? null : v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No linked session</SelectItem>
                    {sessions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.title}
                        {s.starts_at ? ` - ${new Date(s.starts_at).toLocaleString()}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>
                  Connects this block to a scheduled session so the dashboard&apos;s &ldquo;Next live
                  session&rdquo; card and calendar link work.
                </FieldDescription>
              </Field>
            )}

            <Field orientation="horizontal">
              <Checkbox
                id="block-optional"
                checked={values.is_optional}
                onCheckedChange={(v) => setValues({ ...values, is_optional: v === true })}
              />
              <FieldLabel htmlFor="block-optional">Optional - not counted toward lab progress</FieldLabel>
            </Field>

            {msg && (
              <p
                role="status"
                className={msg.type === 'ok' ? 'text-sm text-emerald-600' : 'text-sm text-destructive'}
              >
                {msg.text}
              </p>
            )}
          </FieldGroup>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Spinner className="h-4 w-4" />}
              {mode === 'create' ? 'Add block' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export { BLOCK_TYPE_LABELS, PHASE_LABELS }
