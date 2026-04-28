import Link from 'next/link'
import { ArrowRight, BookOpen } from 'lucide-react'
import { CONTENT_CATEGORIES } from '@/lib/curriculum'
import type { DashboardPhase } from '@/lib/dashboard-data'

interface Props {
  phases: DashboardPhase[]
}

/**
 * Curriculum overview shown on the fellow dashboard. Lists every phase
 * the viewer can see (admins/facilitators see them all). Each card
 * surfaces a category breakdown so fellows can see at a glance what's
 * available in each phase before clicking in.
 */
export function CurriculumList({ phases }: Props) {
  if (phases.length === 0) {
    return (
      <section aria-labelledby="curriculum-heading" className="space-y-4">
        <h3 id="curriculum-heading" className="font-serif text-lg text-primary">
          Curriculum
        </h3>
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <BookOpen
            className="mx-auto mb-3 h-6 w-6 text-text-muted"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-text">
            No curriculum available yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-muted">
            Your facilitator hasn&apos;t assigned any curriculum to your cohort
            yet. Check back soon.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-labelledby="curriculum-heading" className="space-y-4">
      <div className="flex items-end justify-between">
        <h3 id="curriculum-heading" className="font-serif text-lg text-primary">
          Curriculum
        </h3>
        <span className="text-xs text-text-muted">
          {phases.length} phase{phases.length === 1 ? '' : 's'}
        </span>
      </div>

      <ol className="flex flex-col gap-3">
        {phases.map((phase, idx) => (
          <li key={phase.id}>
            <Link
              href={`/phases/${phase.id}`}
              className="group block rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    Phase {idx + 1}
                  </p>
                  <h4 className="mt-1 font-serif text-lg text-primary">
                    {phase.title}
                  </h4>
                  {phase.description && (
                    <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-text-muted">
                      {phase.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 self-center text-sm text-text-muted">
                  <span>
                    {phase.contentCount}{' '}
                    {phase.contentCount === 1 ? 'item' : 'items'}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </div>
              </div>

              {phase.contentCount > 0 && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-text-muted">
                  {CONTENT_CATEGORIES.map((c) => {
                    const n = phase.categoryCounts[c.value]
                    if (!n) return null
                    return (
                      <span key={c.value} className="inline-flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                        {c.short}: {n}
                      </span>
                    )
                  })}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
