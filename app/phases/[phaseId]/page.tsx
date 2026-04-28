import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BookOpen, ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
} from '@/lib/curriculum'

export const dynamic = 'force-dynamic'

interface PhaseRow {
  id: string
  title: string
  description: string | null
  cohorts: string[] | null
}

interface ModuleRow {
  id: string
  phase_id: string
  title: string
  description: string | null
  cohorts: string[] | null
  order_index: number
}

interface ContentVisibilityRow {
  id: string
  module_id: string | null
  cohorts: string[] | null
}

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phaseId: string }>
}) {
  const { phaseId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: modules }, { data: contentRows }] =
    await Promise.all([
      supabase
        .from('years')
        .select('id, title, description, cohorts')
        .eq('id', phaseId)
        .maybeSingle<PhaseRow>(),
      supabase
        .from('modules')
        .select('id, phase_id, title, description, cohorts, order_index')
        .eq('phase_id', phaseId)
        .order('order_index', { ascending: true })
        .returns<ModuleRow[]>(),
      // Pull just enough data to compute visible content count per
      // module without surfacing the contents themselves.
      supabase
        .from('labs')
        .select('id, module_id, cohorts')
        .eq('year_id', phaseId)
        .returns<ContentVisibilityRow[]>(),
    ])

  if (!phase) notFound()

  // Treat hidden phases as 404 so the URL doesn't leak existence.
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null
  if (isFellow && !canFellowSeePhase(phase.cohorts, userCohort)) notFound()

  // Filter modules by visibility (cascading from the phase).
  const visibleModules = (modules ?? []).filter((m) =>
    isFellow
      ? canFellowSeeModule(m.cohorts, phase.cohorts, userCohort)
      : true,
  )

  // For each visible module, count the items the fellow can actually
  // see. Admins/facilitators see everything.
  const moduleCohortById = new Map<string, string[] | null>()
  for (const m of visibleModules) moduleCohortById.set(m.id, m.cohorts)

  const countsByModule = new Map<string, number>()
  for (const item of contentRows ?? []) {
    if (!item.module_id) continue
    if (!moduleCohortById.has(item.module_id)) continue
    if (isFellow) {
      const moduleCohorts = moduleCohortById.get(item.module_id) ?? null
      if (
        !canFellowSeeContent(
          item.cohorts,
          phase.cohorts,
          userCohort,
          moduleCohorts,
        )
      ) {
        continue
      }
    }
    countsByModule.set(
      item.module_id,
      (countsByModule.get(item.module_id) ?? 0) + 1,
    )
  }

  const totalModules = visibleModules.length

  return (
    <AppShell showSidebar currentYearId={phase.id}>
      <div className="space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <Link href="/dashboard" className="hover:text-text">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate font-medium text-text">{phase.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Phase
          </p>
          <h1 className="text-pretty font-serif text-3xl leading-tight text-text md:text-4xl">
            {phase.title}
          </h1>
          {phase.description && (
            <p className="max-w-3xl text-pretty text-base leading-relaxed text-text-muted">
              {phase.description}
            </p>
          )}
          <p className="text-sm text-text-muted">
            {totalModules === 0
              ? 'No modules available yet.'
              : `${totalModules} module${totalModules === 1 ? '' : 's'} available`}
          </p>
        </header>

        {/* Modules */}
        {totalModules === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-text-muted">
              Modules for this phase haven&apos;t been published yet. Check
              back soon.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visibleModules.map((module) => {
              const count = countsByModule.get(module.id) ?? 0
              return (
                <li key={module.id}>
                  <Link
                    href={`/phases/${phase.id}/modules/${module.id}`}
                    className="group flex h-full items-start gap-3 rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
                  >
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-bg-muted text-primary"
                      aria-hidden="true"
                    >
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-tight text-text">
                        {module.title}
                      </p>
                      {module.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
                          {module.description}
                        </p>
                      )}
                      <p className="mt-2 text-xs text-text-muted">
                        {count} {count === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <ChevronRight
                      className="mt-2 h-4 w-4 shrink-0 text-text-muted transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </AppShell>
  )
}
