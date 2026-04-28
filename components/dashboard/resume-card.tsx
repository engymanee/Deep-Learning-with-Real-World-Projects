import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { DashboardResume } from '@/lib/dashboard-data'

/**
 * "Continue where you left off" card. Sends the fellow back into the
 * phase where their next incomplete content item lives - phases are
 * the only navigable curriculum surface in the new content model.
 */
export function ResumeCard({ resume }: { resume: DashboardResume }) {
  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <div className="flex">
        <div className="w-1.5 bg-primary" aria-hidden />

        <CardContent className="flex-1 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Continue where you left off
            </p>
            <h2 className="font-serif text-2xl text-primary text-balance">
              {resume.phaseTitle}
            </h2>
            <p className="text-sm text-text-muted">
              Up next:{' '}
              <span className="font-medium text-text">
                {resume.nextItemTitle}
              </span>
            </p>
            <div className="flex items-center gap-3 pt-1">
              <Progress value={resume.progress} className="h-1.5 flex-1" />
              <span className="whitespace-nowrap text-xs font-medium text-text-muted">
                {resume.progress}% complete
              </span>
            </div>
          </div>

          <Link href={`/phases/${resume.phaseId}`} className="md:self-auto">
            <Button className="whitespace-nowrap" size="lg">
              Resume
            </Button>
          </Link>
        </CardContent>
      </div>
    </Card>
  )
}
