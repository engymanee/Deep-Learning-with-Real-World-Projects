import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ExternalLink } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { CompletionRadio } from '@/components/curriculum/completion-radio'
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
  cohorts: string[] | null
}

interface ModuleRow {
  id: string
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
  duration_minutes: number | null
}

function formatDuration(mins: number | null): string | null {
  if (!mins || mins <= 0) return null
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ phaseId: string; moduleId: string; itemId: string }>
}) {
  const { phaseId, moduleId, itemId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: module }, { data: item }] = await Promise.all([
    supabase
      .from('years')
      .select('id, cohorts')
      .eq('id', phaseId)
      .maybeSingle<PhaseRow>(),
    supabase
      .from('modules')
      .select('id, cohorts')
      .eq('id', moduleId)
      .eq('phase_id', phaseId)
      .maybeSingle<ModuleRow>(),
    supabase
      .from('labs')
      .select(
        'id, module_id, title, description, body, url, category, resource_type, cohorts, duration_minutes',
      )
      .eq('id', itemId)
      .eq('module_id', moduleId)
      .maybeSingle<ContentRow>(),
  ])

  if (!phase || !module || !item) notFound()

  if (user.role === 'fellow') {
    const userCohort = user.cohort ?? null
    if (!canFellowSeePhase(phase.cohorts, userCohort)) notFound()
    if (!canFellowSeeModule(module.cohorts, phase.cohorts, userCohort)) {
      notFound()
    }
    if (
      !canFellowSeeContent(
        item.cohorts,
        phase.cohorts,
        userCohort,
        module.cohorts,
      )
    ) {
      notFound()
    }
  }

  // Look up whether the user has already completed this item, so the
  // toggle below renders in the right initial state.
  const { data: completion } = await supabase
    .from('user_content_completions')
    .select('content_id')
    .eq('profile_id', user.id)
    .eq('content_id', item.id)
    .maybeSingle<{ content_id: string }>()

  const isCompleted = !!completion
  const resource = item.resource_type ? getResourceType(item.resource_type) : null
  const duration = formatDuration(item.duration_minutes)
  const hasBody = !!item.body && item.body.trim().length > 0
  const hasUrl = !!item.url

  return (
    <AppShell showSidebar currentYearId={phaseId} currentLabId={item.id}>
      <article className="mx-auto max-w-2xl space-y-8">
        <Link
          href={`/dashboard#phase-${phaseId}`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Back to curriculum
        </Link>

        <header className="space-y-3">
          {(resource || duration) && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {resource && (
                <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium uppercase tracking-wider">
                  {resource.label}
                </span>
              )}
              {duration && <span>{duration}</span>}
            </div>
          )}
          <h1 className="text-pretty font-serif text-3xl leading-tight text-foreground md:text-4xl">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          )}
        </header>

        {/* Body */}
        {hasBody && (
          <div className="space-y-4 text-base leading-relaxed text-foreground">
            {item.body!.split(/\n{2,}/).map((para, i) => (
              <p key={i} className="whitespace-pre-wrap">
                {para}
              </p>
            ))}
          </div>
        )}

        {/* External resource CTA */}
        {hasUrl && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {hasBody ? 'Linked resource' : 'Open this resource'}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {item.url}
                </p>
              </div>
              <Button asChild>
                <a
                  href={item.url!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </Button>
            </div>
          </div>
        )}

        {!hasBody && !hasUrl && (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              This item has no content attached yet.
            </p>
          </div>
        )}

        {/* Completion control */}
        <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 px-4 py-3">
          <CompletionRadio
            contentId={item.id}
            isCompleted={isCompleted}
            itemTitle={item.title}
          />
          <p className="text-sm text-foreground">
            {isCompleted ? 'Completed' : 'Mark as complete'}
          </p>
        </div>
      </article>
    </AppShell>
  )
}
