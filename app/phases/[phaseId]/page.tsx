import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import { canFellowSeePhase } from '@/lib/curriculum'

export const dynamic = 'force-dynamic'

/**
 * Phase landing page (right pane only - the curriculum tree is
 * provided by the surrounding layout). Shows the phase title,
 * description, and a prompt to pick an item from the tree.
 */
export default async function PhasePage({
  params,
}: {
  params: Promise<{ phaseId: string }>
}) {
  const { phaseId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const { data: phase } = await supabase
    .from('years')
    .select('id, title, description, cohorts')
    .eq('id', phaseId)
    .maybeSingle<{
      id: string
      title: string
      description: string | null
      cohorts: string[] | null
    }>()

  if (!phase) notFound()
  if (
    user.role === 'fellow' &&
    !canFellowSeePhase(phase.cohorts, user.cohort ?? null)
  ) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-3">
        <h1 className="text-pretty font-serif text-3xl leading-tight text-foreground md:text-4xl">
          {phase.title}
        </h1>
        {phase.description && (
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            {phase.description}
          </p>
        )}
      </header>

      <div className="rounded-lg border border-dashed border-border p-10 text-center">
        <p className="text-sm text-muted-foreground">
          Choose a module from the curriculum to begin.
        </p>
      </div>
    </div>
  )
}
