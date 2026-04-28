import { TopBar } from '@/components/top-bar'
import { CurriculumTree } from '@/components/curriculum/curriculum-tree'
import { loadCurriculumTree } from '@/lib/curriculum-tree'

export const dynamic = 'force-dynamic'

/**
 * Shared layout for the entire `/phases/[phaseId]/...` subtree.
 *
 * Renders the curriculum tree on the left and whatever the active
 * page is on the right. The tree determines its own active state
 * from the current pathname, so this layout doesn't need to know
 * about modules or items.
 */
export default async function PhaseLayout({
  params,
  children,
}: {
  params: Promise<{ phaseId: string }>
  children: React.ReactNode
}) {
  const { phaseId } = await params
  const tree = await loadCurriculumTree(phaseId)

  return (
    <div className="min-h-screen bg-bg">
      <TopBar />
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row lg:gap-10">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <div className="lg:sticky lg:top-24">
            <CurriculumTree tree={tree} />
          </div>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
