import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

/**
 * Shown to learners with no progress yet. Invites them into the first lab.
 */
export function StartYearCard({
  yearTitle,
  startLabId,
}: {
  yearTitle: string
  startLabId: string | null
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
            You&apos;re beginning a transformative three-year journey. Your
            first Wisdom Lab walks you through a Before, During, and After flow
            - readings and reflection prompts ahead of the live session,
            protocols in the room, and follow-up practice afterwards.
          </p>
          {startLabId ? (
            <Link href={`/labs/${startLabId}`}>
              <Button size="lg">Get Started</Button>
            </Link>
          ) : (
            <Button size="lg" disabled>
              No labs available yet
            </Button>
          )}
        </CardContent>
      </div>
    </Card>
  )
}
