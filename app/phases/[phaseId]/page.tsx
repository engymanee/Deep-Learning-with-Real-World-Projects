import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight, ExternalLink, FileText } from 'lucide-react'
import { AppShell } from '@/components/app-shell'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  CONTENT_CATEGORIES,
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
  description: string | null
  cohorts: string[] | null
}

interface ContentRow {
  id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory | null
  resource_type: ResourceType | null
  cohorts: string[] | null
  order_index: number
}

export default async function PhasePage({
  params,
}: {
  params: Promise<{ phaseId: string }>
}) {
  const { phaseId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: items }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, cohorts')
      .eq('id', phaseId)
      .maybeSingle<PhaseRow>(),
    supabase
      .from('labs')
      .select(
        'id, title, description, body, url, category, resource_type, cohorts, order_index',
      )
      .eq('year_id', phaseId)
      .order('order_index', { ascending: true })
      .returns<ContentRow[]>(),
  ])

  if (!phase) notFound()

  // Treat hidden phases as 404 so the URL doesn't leak existence.
  const isFellow = user.role === 'fellow'
  const userCohort = user.cohort ?? null
  if (isFellow && !canFellowSeePhase(phase.cohorts, userCohort)) notFound()

  // Filter items by visibility, then group by category.
  const visibleItems = (items ?? []).filter((item) => {
    if (!item.category) return false
    if (!isFellow) return true
    return canFellowSeeContent(item.cohorts, phase.cohorts, userCohort)
  })
  const itemsByCategory = new Map<ContentCategory, ContentRow[]>()
  for (const cat of CONTENT_CATEGORIES) itemsByCategory.set(cat.value, [])
  for (const item of visibleItems) {
    if (item.category) itemsByCategory.get(item.category)!.push(item)
  }

  const totalVisible = visibleItems.length

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
            {totalVisible === 0
              ? 'No content available yet.'
              : `${totalVisible} item${totalVisible === 1 ? '' : 's'} available`}
          </p>
        </header>

        {/* Categories */}
        {totalVisible === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-10 text-center">
            <p className="text-sm text-text-muted">
              Content for this phase hasn&apos;t been published yet. Check
              back soon.
            </p>
          </div>
        ) : (
          <div className="space-y-12">
            {CONTENT_CATEGORIES.map((cat) => {
              const list = itemsByCategory.get(cat.value) ?? []
              if (list.length === 0) return null
              return (
                <CategoryBlock
                  key={cat.value}
                  category={cat.value}
                  phaseId={phase.id}
                  items={list}
                />
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function CategoryBlock({
  category,
  phaseId,
  items,
}: {
  category: ContentCategory
  phaseId: string
  items: ContentRow[]
}) {
  const meta = getCategory(category)
  return (
    <section
      aria-labelledby={`cat-${category}`}
      className="space-y-4"
    >
      <div>
        <h2
          id={`cat-${category}`}
          className="font-serif text-xl font-semibold text-text md:text-2xl"
        >
          {meta.label}
        </h2>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-text-muted">
          {meta.description}
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const resource = item.resource_type
            ? getResourceType(item.resource_type)
            : null
          return (
            <li key={item.id}>
              <Link
                href={`/phases/${phaseId}/items/${item.id}`}
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
    </section>
  )
}
