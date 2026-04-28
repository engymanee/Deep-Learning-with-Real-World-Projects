'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ClipboardList,
  FileText,
  MessageSquare,
  Pencil,
  Plus,
  Presentation,
  Trash2,
  Video,
  Wrench,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Spinner } from '@/components/ui/spinner'
import { deleteBlock, moveBlock } from '../../actions'
import { BlockDialog, type BlockFormValues } from './block-dialog'

type Phase = 'before' | 'during' | 'after'
type BlockType =
  | 'reading'
  | 'video'
  | 'reflection_prompt'
  | 'protocol'
  | 'session_link'
  | 'slides'
  | 'survey'
  | 'follow_up_task'

type Block = {
  id: string
  phase: Phase
  block_type: BlockType
  order_index: number
  title: string
  body: string | null
  url: string | null
  duration_minutes: number | null
  is_optional: boolean
  session_id: string | null
}

type SessionRow = { id: string; title: string; starts_at: string | null }

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  reading: 'Reading',
  video: 'Video',
  reflection_prompt: 'Reflection prompt',
  protocol: 'Protocol / tool',
  session_link: 'Session link',
  slides: 'Slides / handout',
  survey: 'Survey',
  follow_up_task: 'Follow-up task',
}

const BLOCK_ICONS: Record<BlockType, typeof BookOpen> = {
  reading: BookOpen,
  video: Video,
  reflection_prompt: MessageSquare,
  protocol: Wrench,
  session_link: Video,
  slides: Presentation,
  survey: ClipboardList,
  follow_up_task: FileText,
}

const EMPTY_CREATE_DEFAULTS = (labId: string, phase: Phase): BlockFormValues => ({
  lab_id: labId,
  phase,
  block_type: 'reading',
  title: '',
  body: '',
  url: '',
  duration_minutes: null,
  is_optional: false,
  session_id: null,
})

export function BlockList({
  labId,
  phase,
  blocks,
  sessions,
}: {
  labId: string
  phase: Phase
  blocks: Block[]
  sessions: SessionRow[]
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [activeBlock, setActiveBlock] = useState<Block | null>(null)
  const [isPending, startTransition] = useTransition()
  const [toast, setToast] = useState<string | null>(null)

  function openCreate() {
    setMode('create')
    setActiveBlock(null)
    setDialogOpen(true)
  }

  function openEdit(block: Block) {
    setMode('edit')
    setActiveBlock(block)
    setDialogOpen(true)
  }

  function run(fd: FormData, action: (fd: FormData) => Promise<{ ok: boolean; message: string }>) {
    setToast(null)
    startTransition(async () => {
      const r = await action(fd)
      setToast(r.message)
      setTimeout(() => setToast(null), 2500)
    })
  }

  function handleMove(block: Block, direction: 'up' | 'down') {
    const fd = new FormData()
    fd.set('id', block.id)
    fd.set('lab_id', labId)
    fd.set('direction', direction)
    run(fd, moveBlock)
  }

  function handleDelete(block: Block) {
    if (!confirm(`Delete "${block.title}"? This cannot be undone.`)) return
    const fd = new FormData()
    fd.set('id', block.id)
    fd.set('lab_id', labId)
    run(fd, deleteBlock)
  }

  const initial: BlockFormValues = useMemo(() => {
    if (mode === 'edit' && activeBlock) {
      return {
        id: activeBlock.id,
        lab_id: labId,
        phase: activeBlock.phase,
        block_type: activeBlock.block_type,
        title: activeBlock.title,
        body: activeBlock.body ?? '',
        url: activeBlock.url ?? '',
        duration_minutes: activeBlock.duration_minutes,
        is_optional: activeBlock.is_optional,
        session_id: activeBlock.session_id,
      }
    }
    return EMPTY_CREATE_DEFAULTS(labId, phase)
  }, [mode, activeBlock, labId, phase])

  return (
    <section className="bg-card border border-border rounded-lg">
      <header className="flex items-center justify-end gap-3 px-6 py-4 border-b border-border">
        {toast && <span className="text-xs text-muted-foreground">{toast}</span>}
        <Button onClick={openCreate} size="sm" variant="outline">
          <Plus className="w-4 h-4" />
          Add block
        </Button>
      </header>

      {blocks.length === 0 ? (
        <div className="p-6">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Plus className="w-5 h-5" />
              </EmptyMedia>
              <EmptyTitle>No content yet</EmptyTitle>
              <EmptyDescription>
                Add the first block to start authoring content for this phase.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={openCreate} size="sm">
                Add block
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {blocks.map((block, idx) => {
            const Icon = BLOCK_ICONS[block.block_type]
            return (
              <li key={block.id} className="px-6 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-foreground truncate">{block.title}</h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                      {BLOCK_TYPE_LABELS[block.block_type]}
                    </span>
                    {block.is_optional && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Optional
                      </span>
                    )}
                    {block.duration_minutes != null && (
                      <span className="text-xs text-muted-foreground">
                        {block.duration_minutes} min
                      </span>
                    )}
                  </div>
                  {block.body && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{block.body}</p>
                  )}
                  {block.url && (
                    <p className="text-xs text-muted-foreground truncate font-mono">{block.url}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isPending && <Spinner className="w-4 h-4 text-muted-foreground" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={idx === 0 || isPending}
                    onClick={() => handleMove(block, 'up')}
                    aria-label="Move up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={idx === blocks.length - 1 || isPending}
                    onClick={() => handleMove(block, 'down')}
                    aria-label="Move down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(block)}
                    aria-label="Edit block"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(block)}
                    disabled={isPending}
                    aria-label="Delete block"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <BlockDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        initial={initial}
        sessions={sessions}
      />
    </section>
  )
}
