import Link from 'next/link'
import { ArrowRight, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { CohortBadge } from '@/components/admin/cohort-access-field'
import { CreatePhaseDialog } from './create-phase-dialog'

export const dynamic = 'force-dynamic'

type PhaseRow = {
  id: string
  title: string
  description: string | null
  order_index: number
  cohorts: string[] | null
}

type ContentCountRow = {
  year_id: string
}

export default async function AdminCurriculumPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [{ data: phases }, { data: contents }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, order_index, cohorts')
      .order('order_index', { ascending: true })
      .returns<PhaseRow[]>(),
    supabase
      .from('labs')
      .select('year_id')
      .returns<ContentCountRow[]>(),
  ])

  // Tally content count per phase. Categories deliberately aren't
  // surfaced anywhere outside the create dialog, so we don't compute a
  // per-category breakdown here.
  const totals = new Map<string, number>()
  for (const row of contents ?? []) {
    if (!row.year_id) continue
    totals.set(row.year_id, (totals.get(row.year_id) ?? 0) + 1)
  }

  const phaseList = phases ?? []

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-foreground">Phases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            A phase is a top-level grouping of content (e.g. &ldquo;Year One:
            Deep Learning&rdquo;). Create phases here, then click into one to
            add content.
          </p>
        </div>
        <CreatePhaseDialog />
      </div>

      {phaseList.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-10 text-center">
          <Layers
            className="mx-auto mb-3 h-8 w-8 text-muted-foreground"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">No phases yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Click &ldquo;New phase&rdquo; above to create the first one. Phases
            are the top-level scaffolding of the curriculum.
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {phaseList.map((phase, idx) => {
            const count = totals.get(phase.id) ?? 0
            return (
              <li key={phase.id}>
                <Link
                  href={`/admin/curriculum/${phase.id}`}
                  className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-foreground/30"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          Phase {idx + 1}
                        </span>
                        <CohortBadge cohorts={phase.cohorts} />
                      </div>
                      <h3 className="mt-1 font-serif text-lg text-foreground">
                        {phase.title}
                      </h3>
                      {phase.description && (
                        <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                          {phase.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 self-center text-sm text-muted-foreground">
                      <span>
                        {count} {count === 1 ? 'item' : 'items'}
                      </span>
                      <ArrowRight
                        className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </div>
                  </div>

                </Link>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
