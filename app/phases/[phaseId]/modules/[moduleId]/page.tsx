import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ExternalLink, FileText } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
  getResourceType,
  type ContentCategory,
  type ResourceType,
} from '@/lib/curriculum'

export const dynamic = 'force-dynamic'

interface PhaseRow {
  id: string
  title: string
  cohorts: string[] | null
}

interface ModuleRow {
  id: string
  phase_id: string
  title: string
  description: string | null
  cohorts: string[] | null
}

interface ContentRow {
  id: string
  module_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory | null
  resource_type: ResourceType | null
  cohorts: string[] | null
  order_index: number
}

export default async function ModulePage({
  params,
}: {
  params: Promise<{ phaseId: string; moduleId: string }>
}) {
  const { phaseId, moduleId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: module }, { data: items }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, cohorts')
      .eq('id', phaseId)
      .maybeSingle<PhaseRow>(),
    supabase
      .from('modules')
      .select('id, phase_id, title, description, cohorts')
      .eq('id', moduleId)
      .eq('phase_id', phaseId)
      .maybeSingle<ModuleRow>(),
    supabase
      .from('labs')
      .select(
        'id, module_id, title, description, body, url, category, resource_type, cohorts, order_index',
      )
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true })
      .returns<ContentRow[]>(),
  ])

  if (!phase || !module) notFound()

  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null
  if (isFellow) {
    if (!canFellowSeePhase(phase.cohorts, userCohort)) notFound()
    if (!canFellowSeeModule(module.cohorts, phase.cohorts, userCohort)) {
      notFound()
    }
  }

  // Filter items by visibility cascading through module + phase.
  const visibleItems = (items ?? []).filter((item) => {
    if (!item.category) return false
    if (!isFellow) return true
    return canFellowSeeContent(
      item.cohorts,
      phase.cohorts,
      userCohort,
      module.cohorts,
    )
  })

  const totalVisible = visibleItems.length

  return (
    <AppShell showSidebar currentYearId={phase.id}>
      <div className="space-y-10">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted"
        >
          <Link href="/dashboard" className="hover:text-text">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link
            href={`/phases/${phase.id}`}
            className="max-w-[160px] truncate hover:text-text sm:max-w-none"
          >
            {phase.title}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate font-medium text-text">{module.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Module
          </p>
          <h1 className="text-pretty font-serif text-3xl leading-tight text-text md:text-4xl">
            {module.title}
          </h1>
          {module.description && (
            <p className="max-w-3xl text-pretty text-base leading-relaxed text-text-muted">
              {module.description}
            </p>
          )}
          <p className="text-sm text-text-muted">
            {totalVisible === 0
              ? 'No content available yet.'
              : `${totalVisible} item${totalVisible === 1 ? '' : 's'} available`}
          </p>
        </header>

        {/* Content list */}
        {totalVisible === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-text-muted">
              Content for this module hasn&apos;t been published yet. Check
              back soon.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {visibleItems.map((item) => {
              const resource = item.resource_type
                ? getResourceType(item.resource_type)
                : null
              return (
                <li key={item.id}>
                  <Link
                    href={`/phases/${phase.id}/modules/${module.id}/items/${item.id}`}
                    className="group flex items-start gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
                  >
                    <span
                      className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-md bg-bg-muted text-primary"
                      aria-hidden="true"
                    >
                      {item.url ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {resource && (
                          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            {resource.label}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-medium leading-tight text-text">
                        {item.title}
                      </p>
                      {item.description && (
                        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-text-muted">
                          {item.description}
                        </p>
                      )}
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

        {/* Back link */}
        <div className="pt-2">
          <Link
            href={`/phases/${phase.id}`}
            className="text-sm text-text-muted hover:text-text"
          >
            &larr; Back to {phase.title}
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
