import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeModule,
  canFellowSeePhase,
} from '@/lib/curriculum'

export const dynamic = 'force-dynamic'

/**
 * Module landing page (right pane only). The user already sees the
 * module's items in the curriculum tree on the left, so this page
 * just shows the module title, description, and a prompt to pick a
 * specific item.
 */
export default async function ModulePage({
  params,
}: {
  params: Promise<{ phaseId: string; moduleId: string }>
}) {
  const { phaseId, moduleId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: module }] = await Promise.all([
    supabase
      .from('years')
      .select('id, cohorts')
      .eq('id', phaseId)
      .maybeSingle<{ id: string; cohorts: string[] | null }>(),
    supabase
      .from('modules')
      .select('id, phase_id, title, description, cohorts')
      .eq('id', moduleId)
      .eq('phase_id', phaseId)
      .maybeSingle<{
        id: string
        phase_id: string
        title: string
        description: string | null
        cohorts: string[] | null
      }>(),
  ])

  if (!phase || !module) notFound()

  if (user.role === 'fellow') {
    const userCohort = user.cohort ?? null
    if (!canFellowSeePhase(phase.cohorts, userCohort)) notFound()
    if (!canFellowSeeModule(module.cohorts, phase.cohorts, userCohort)) {
      notFound()
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-pretty font-serif text-3xl leading-tight text-foreground md:text-4xl">
          {module.title}
        </h1>
        {module.description && (
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            {module.description}
          </p>
        )}
      </header>

      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Choose an item from this module to begin.
        </p>
      </div>
    </div>
  )
}
