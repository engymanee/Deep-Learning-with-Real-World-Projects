import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ExternalLink } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeePhase,
  getCategory,
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

interface ContentRow {
  id: string
  year_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory | null
  resource_type: ResourceType | null
  cohorts: string[] | null
}

export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ phaseId: string; itemId: string }>
}) {
  const { phaseId, itemId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: item }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, cohorts')
      .eq('id', phaseId)
      .maybeSingle<PhaseRow>(),
    supabase
      .from('labs')
      .select(
        'id, year_id, title, description, body, url, category, resource_type, cohorts',
      )
      .eq('id', itemId)
      .eq('year_id', phaseId)
      .maybeSingle<ContentRow>(),
  ])

  if (!phase || !item) notFound()

  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null
  if (isFellow) {
    if (!canFellowSeePhase(phase.cohorts, userCohort)) notFound()
    if (!canFellowSeeContent(item.cohorts, phase.cohorts, userCohort)) notFound()
  }

  const category = item.category ? getCategory(item.category) : null
  const resource = item.resource_type ? getResourceType(item.resource_type) : null
  const hasBody = !!item.body && item.body.trim().length > 0
  const hasUrl = !!item.url

  return (
    <AppShell showSidebar currentYearId={phase.id} currentLabId={item.id}>
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-text-muted"
        >
          <Link href="/dashboard" className="hover:text-text">
            Dashboard
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <Link
            href={`/phases/${phase.id}`}
            className="max-w-[180px] truncate hover:text-text sm:max-w-none"
          >
            {phase.title}
          </Link>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span className="truncate font-medium text-text">{item.title}</span>
        </nav>

        {/* Header */}
        <header className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {category.label}
              </span>
            )}
            {resource && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {resource.label}
              </span>
            )}
          </div>
          <h1 className="text-pretty font-serif text-3xl leading-tight text-text md:text-4xl">
            {item.title}
          </h1>
          {item.description && (
            <p className="text-pretty text-base leading-relaxed text-text-muted">
              {item.description}
            </p>
          )}
        </header>

        {/* Body */}
        {hasBody && (
          <article className="prose prose-sm max-w-none text-text">
            {item.body!.split(/\n{2,}/).map((para, i) => (
              <p
                key={i}
                className="whitespace-pre-wrap text-base leading-relaxed text-text"
              >
                {para}
              </p>
            ))}
          </article>
        )}

        {/* Link CTA */}
        {hasUrl && (
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">
                  {hasBody ? 'Linked resource' : 'Open this resource'}
                </p>
                <p className="mt-0.5 truncate text-xs text-text-muted">
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
            <p className="text-sm text-text-muted">
              This item has no content attached yet.
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="pt-4">
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
