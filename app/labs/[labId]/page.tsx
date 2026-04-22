import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { LabBlockCard, type BlockType } from '@/components/lab-block-card'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { stripYearPrefix } from '@/lib/year-labels'

type Phase = 'before' | 'during' | 'after'

interface LabRow {
  id: string
  title: string
  description: string | null
  year_id: string
  order_index: number
  years: { id: string; title: string } | null
}

interface BlockRow {
  id: string
  lab_id: string
  phase: Phase
  block_type: BlockType
  order_index: number
  title: string
  body: string | null
  url: string | null
  duration_minutes: number | null
  is_optional: boolean
}

const PHASE_META: Record<Phase, { title: string; blurb: string }> = {
  before: {
    title: 'Before the lab',
    blurb: 'Prepare yourself - readings, reflections, and context that set up the live session.',
  },
  during: {
    title: 'During the lab',
    blurb: 'The live session itself - join link, agenda, and any protocols your cohort will practice together.',
  },
  after: {
    title: 'After the lab',
    blurb: 'Integrate and apply - slides, follow-up practices, and a short survey to close out the lab.',
  },
}

export default async function LabPage({
  params,
}: {
  params: Promise<{ labId: string }>
}) {
  const { labId } = await params

  // Auth guard
  const user = await requireUser()
  const supabase = await createClient()

  // Lab + year
  const { data: lab } = await supabase
    .from('labs')
    .select('id, title, description, year_id, order_index, years(id, title)')
    .eq('id', labId)
    .maybeSingle<LabRow>()

  if (!lab) notFound()

  // Blocks for this lab (ordered by phase -> order_index)
  const { data: blocksData } = await supabase
    .from('lab_content_blocks')
    .select(
      'id, lab_id, phase, block_type, order_index, title, body, url, duration_minutes, is_optional',
    )
    .eq('lab_id', lab.id)
    .order('phase', { ascending: true })
    .order('order_index', { ascending: true })

  const blocks: BlockRow[] = blocksData ?? []

  // Completions (self, thanks to RLS)
  const { data: completionsData } = await supabase
    .from('user_block_completions')
    .select('block_id')
    .eq('profile_id', user.id)
    .in(
      'block_id',
      blocks.map((b) => b.id),
    )

  const completedSet = new Set((completionsData ?? []).map((c) => c.block_id))

  // Group by phase
  const blocksByPhase: Record<Phase, BlockRow[]> = { before: [], during: [], after: [] }
  for (const b of blocks) blocksByPhase[b.phase].push(b)

  const totalRequired = blocks.filter((b) => !b.is_optional).length
  const completedRequired = blocks.filter(
    (b) => !b.is_optional && completedSet.has(b.id),
  ).length
  const pct = totalRequired === 0 ? 0 : Math.round((completedRequired / totalRequired) * 100)

  const yearTitle = stripYearPrefix(lab.years?.title) || lab.years?.title || ''
  const yearId = lab.years?.id ?? lab.year_id

  return (
    <AppShell showSidebar currentYearId={yearId} currentLabId={lab.id}>
      <div className="space-y-8">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-text-muted">
          <Link href="/dashboard" className="hover:text-text">
            Home
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="max-w-[220px] truncate sm:max-w-none">{yearTitle}</span>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate font-medium text-text">{lab.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            {yearTitle}
          </p>
          <h1 className="text-pretty font-serif text-3xl leading-tight text-text md:text-4xl">
            {lab.title}
          </h1>
          {lab.description && (
            <p className="max-w-3xl text-pretty text-base leading-relaxed text-text-muted">
              {lab.description}
            </p>
          )}

          {/* Progress */}
          <div
            className="mt-2 flex items-center gap-3"
            role="group"
            aria-label="Lab progress"
          >
            <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="whitespace-nowrap text-xs font-medium text-text-muted">
              {completedRequired} of {totalRequired} complete
            </span>
          </div>
        </header>

        {/* Phase sections */}
        <div className="space-y-10">
          {(['before', 'during', 'after'] as const).map((phase) => {
            const phaseBlocks = blocksByPhase[phase]
            if (phaseBlocks.length === 0) return null

            return (
              <section key={phase} aria-labelledby={`phase-${phase}`} className="space-y-4">
                <div>
                  <h2
                    id={`phase-${phase}`}
                    className="font-serif text-xl font-semibold text-text md:text-2xl"
                  >
                    {PHASE_META[phase].title}
                  </h2>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-muted">
                    {PHASE_META[phase].blurb}
                  </p>
                </div>

                <div className="space-y-3">
                  {phaseBlocks.map((b) => (
                    <LabBlockCard
                      key={b.id}
                      block={{
                        id: b.id,
                        block_type: b.block_type,
                        title: b.title,
                        body: b.body,
                        url: b.url,
                        duration_minutes: b.duration_minutes,
                        is_optional: b.is_optional,
                      }}
                      labId={lab.id}
                      initialCompleted={completedSet.has(b.id)}
                    />
                  ))}
                </div>
              </section>
            )
          })}

          {blocks.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <p className="text-sm text-text-muted">
                Your facilitator hasn&apos;t published content for this lab yet. Check back soon.
              </p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  )
}
