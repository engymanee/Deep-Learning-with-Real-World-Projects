import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { AddYearDialog } from './add-year-dialog'
import { PhaseSection, type AdminPhase, type AdminContentItem } from './phase-section'

export const dynamic = 'force-dynamic'

type YearRow = {
  id: string
  title: string
  description: string | null
  order_index: number
  cohorts: string[] | null
}

type LabRow = {
  id: string
  year_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: AdminContentItem['category'] | null
  resource_type: AdminContentItem['resource_type'] | null
  order_index: number
  cohorts: string[] | null
}

/**
 * Admin curriculum console.
 *
 * The curriculum is a flat two-level structure:
 *   Phase  -> Content item (one resource each, grouped by category)
 *
 * Admins manage everything here. Each phase shows its full content
 * stack grouped by category (Before / During / After / General /
 * Wisdom Coaching / Community of Practice), with an "Add content"
 * button per category and inline edit/delete on every row.
 */
export default async function AdminCurriculumPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [{ data: years }, { data: labs }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, order_index, cohorts')
      .order('order_index', { ascending: true }),
    supabase
      .from('labs')
      .select(
        'id, year_id, title, description, body, url, category, resource_type, order_index, cohorts',
      )
      .order('order_index', { ascending: true }),
  ])

  // Group items by phase. Items with no category set (legacy rows from
  // before the migration, if any) are dropped from the admin view —
  // they need to be migrated explicitly before they can be edited
  // here.
  const itemsByYear = new Map<string, AdminContentItem[]>()
  for (const lab of (labs ?? []) as LabRow[]) {
    if (!lab.category || !lab.resource_type) continue
    const list = itemsByYear.get(lab.year_id) ?? []
    list.push({
      id: lab.id,
      year_id: lab.year_id,
      title: lab.title,
      description: lab.description,
      body: lab.body,
      url: lab.url,
      category: lab.category,
      resource_type: lab.resource_type,
      cohorts: lab.cohorts,
    })
    itemsByYear.set(lab.year_id, list)
  }

  const phases: AdminPhase[] = ((years ?? []) as YearRow[]).map((y) => ({
    id: y.id,
    title: y.title,
    description: y.description,
    cohorts: y.cohorts ?? [],
    items: itemsByYear.get(y.id) ?? [],
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-foreground">Phases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each phase is a stage of the program. Inside each phase, add
            content grouped by category - Before the Lab, During the Lab,
            After the Lab, plus standing categories for general resources,
            wisdom coaching, and community of practice.
          </p>
        </div>
        <AddYearDialog />
      </div>

      {phases.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No phases yet. Click &ldquo;Add phase&rdquo; above to create the first one.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {phases.map((phase) => (
            <PhaseSection key={phase.id} phase={phase} />
          ))}
        </div>
      )}
    </div>
  )
}
