import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import {
  CONTENT_CATEGORIES,
  type ContentCategory,
  type ResourceType,
} from '@/lib/curriculum'
import { PhaseDetailsForm } from './phase-details-form'
import { CategorySection } from './category-section'

export const dynamic = 'force-dynamic'

type PhaseRow = {
  id: string
  title: string
  description: string | null
  cohorts: string[] | null
}

export type ContentRow = {
  id: string
  year_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory
  resource_type: ResourceType
  cohorts: string[] | null
  order_index: number
}

export default async function AdminPhaseDetailPage({
  params,
}: {
  params: Promise<{ phaseId: string }>
}) {
  await requireAdmin()
  const { phaseId } = await params
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
        'id, year_id, title, description, body, url, category, resource_type, cohorts, order_index',
      )
      .eq('year_id', phaseId)
      .order('order_index', { ascending: true })
      .returns<ContentRow[]>(),
  ])

  if (!phase) notFound()

  const itemsByCategory = new Map<ContentCategory, ContentRow[]>()
  for (const cat of CONTENT_CATEGORIES) itemsByCategory.set(cat.value, [])
  for (const item of items ?? []) {
    if (item.category) itemsByCategory.get(item.category)?.push(item)
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href="/admin/curriculum"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All phases
        </Link>
      </div>

      <PhaseDetailsForm
        phase={{
          id: phase.id,
          title: phase.title,
          description: phase.description ?? '',
          cohorts: phase.cohorts ?? [],
        }}
      />

      <section className="flex flex-col gap-8">
        <div>
          <h2 className="font-serif text-xl text-foreground">Content</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Add content under any of the categories below. Each piece of
            content has a resource type (reading, video, slide deck, etc.)
            and either a body or a URL. By default, content inherits cohort
            access from the phase - you can override per item if needed.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {CONTENT_CATEGORIES.map((cat) => (
            <CategorySection
              key={cat.value}
              category={cat.value}
              phaseId={phase.id}
              phaseCohorts={phase.cohorts ?? []}
              items={itemsByCategory.get(cat.value) ?? []}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
