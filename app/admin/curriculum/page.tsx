import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { CurriculumBoard } from './curriculum-board'
import { AddYearDialog } from './add-year-dialog'

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
  order_index: number
  cohorts: string[] | null
}

export default async function AdminCurriculumPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [{ data: years }, { data: labs }, { data: blockCounts }] = await Promise.all([
    supabase
      .from('years')
      .select('id, title, description, order_index, cohorts')
      .order('order_index', { ascending: true }),
    supabase
      .from('labs')
      .select('id, year_id, title, description, order_index, cohorts')
      .order('order_index', { ascending: true }),
    supabase.from('lab_content_blocks').select('lab_id'),
  ])

  // Count blocks per item so each row can show how populated it is.
  const blockCountByLab = new Map<string, number>()
  for (const row of blockCounts ?? []) {
    blockCountByLab.set(row.lab_id, (blockCountByLab.get(row.lab_id) ?? 0) + 1)
  }

  const labsByYear = new Map<string, LabRow[]>()
  for (const lab of (labs ?? []) as LabRow[]) {
    const list = labsByYear.get(lab.year_id) ?? []
    list.push(lab)
    labsByYear.set(lab.year_id, list)
  }

  const yearsList = (years ?? []) as YearRow[]

  const initialPhases = yearsList.map((year) => ({
    id: year.id,
    title: year.title,
    description: year.description,
    cohorts: year.cohorts ?? [],
    items: (labsByYear.get(year.id) ?? []).map((lab) => ({
      id: lab.id,
      year_id: lab.year_id,
      title: lab.title,
      description: lab.description,
      cohorts: lab.cohorts ?? [],
      block_count: blockCountByLab.get(lab.id) ?? 0,
    })),
  }))

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-xl text-foreground">Phases</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Full program structure: add phases, add contents under each phase, and then
            click Edit Content to build out the before, during, and after flow for each
            section.
          </p>
        </div>
        <AddYearDialog />
      </div>

      {yearsList.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No phases yet. Click &ldquo;Add phase&rdquo; above to create the first one.
        </p>
      ) : (
        <CurriculumBoard initialPhases={initialPhases} />
      )}
    </div>
  )
}
