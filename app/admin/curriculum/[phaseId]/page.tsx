import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import type { ContentCategory, ResourceType } from '@/lib/curriculum'
import { PhaseDetailsForm } from './phase-details-form'
import { ContentList } from './content-list'

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

      <ContentList
        phaseId={phase.id}
        phaseCohorts={phase.cohorts ?? []}
        items={items ?? []}
      />
    </div>
  )
}
