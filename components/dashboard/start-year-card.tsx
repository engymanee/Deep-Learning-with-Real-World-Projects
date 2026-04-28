import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * CTA shown to learners who haven't completed any items yet. Drops
 * them straight into the first unlocked phase, where every content
 * item lives inline and they can pick a starting point.
 */
export function StartYearCard({
  yearTitle,
  startPhaseId,
}: {
  yearTitle: string
  startPhaseId: string | null
}) {
  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <div className="flex">
        <div className="w-1.5 bg-primary" aria-hidden />

        <CardContent className="flex-1 p-8 space-y-4">
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Welcome to Wisdom At Work
          </p>
          <h2 className="font-serif text-2xl text-primary">
            Start {yearTitle}
          </h2>
          <p className="text-sm text-text leading-relaxed">
            Each phase brings together everything you need - readings,
            reflection prompts, lab protocols, and follow-up practice -
            organized by Before, During, and After alongside your
            general resources, wisdom coaching, and community of
            practice. Open the phase to see what&apos;s assigned and
            begin wherever feels right.
          </p>
          {startPhaseId ? (
            <Link href={`/phases/${startPhaseId}`}>
              <Button size="lg">Get Started</Button>
            </Link>
          ) : (
            <Button size="lg" disabled>
              No phases available yet
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
