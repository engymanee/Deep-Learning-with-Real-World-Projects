import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronLeft } from 'lucide-react'

import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { BlockList } from './block-list'

export const dynamic = 'force-dynamic'

const PHASES: { key: 'before' | 'during' | 'after'; title: string; description: string }[] = [
  {
    key: 'before',
    title: 'Before the lab',
    description: 'Pre-work: readings, videos, and reflection prompts the Fellow completes before joining the live session.',
  },
  {
    key: 'during',
    title: 'During the lab',
    description: 'Live session content: the Zoom link, facilitator protocols, and any in-session tools.',
  },
  {
    key: 'after',
    title: 'After the lab',
    description: 'Follow-up: slides, surveys, and between-lab practice tasks.',
  },
]

export default async function CurriculumLabEditorPage({
  params,
}: {
  params: Promise<{ labId: string }>
}) {
  await requireAdmin()
  const { labId } = await params
  const supabase = await createClient()

  const { data: lab, error: labErr } = await supabase
    .from('labs')
    .select('id, title, description, year_id, order_index, years ( id, title )')
    .eq('id', labId)
    .single()

  if (labErr || !lab) notFound()

  const { data: blocks, error: blocksErr } = await supabase
    .from('lab_content_blocks')
    .select('id, phase, block_type, order_index, title, body, url, duration_minutes, is_optional, session_id')
    .eq('lab_id', labId)
    .order('phase', { ascending: true })
    .order('order_index', { ascending: true })

  if (blocksErr) {
    throw new Error(`Failed to load blocks: ${blocksErr.message}`)
  }

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, title, starts_at')
    .eq('lab_id', labId)
    .order('starts_at', { ascending: true })

  const year = Array.isArray(lab.years) ? lab.years[0] : lab.years

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to curriculum
        </Link>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-text-muted">{year?.title}</p>
            <h1 className="text-3xl font-serif text-text text-balance">{lab.title}</h1>
            {lab.description && (
              <p className="text-text-muted text-pretty max-w-3xl">{lab.description}</p>
            )}
          </div>
          <Button asChild variant="outline">
            <Link href={`/labs/${lab.id}`}>
              <ArrowLeft className="w-4 h-4 rotate-180" />
              Preview as learner
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {PHASES.map((phase) => {
          const phaseBlocks = (blocks ?? []).filter((b) => b.phase === phase.key)
          return (
            <BlockList
              key={phase.key}
              labId={lab.id}
              phase={phase.key}
              phaseTitle={phase.title}
              phaseDescription={phase.description}
              blocks={phaseBlocks}
              sessions={sessions ?? []}
            />
          )
        })}
      </div>
    </div>
  )
}
