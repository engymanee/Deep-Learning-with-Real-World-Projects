import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { DashboardResume } from '@/lib/dashboard-data'

function formatTimeRemaining(minutes: number): string {
  if (minutes <= 0) return 'almost done'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
}

export function ResumeCard({ resume }: { resume: DashboardResume }) {
  return (
    <Card className="border-0 shadow-card overflow-hidden">
      <div className="flex">
        {/* Navy accent stripe */}
        <div className="w-1.5 bg-primary" aria-hidden />

        <CardContent className="flex-1 p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1 space-y-3">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
              Continue where you left off
            </p>
            <h2 className="font-serif text-2xl text-primary text-balance">
              {resume.labTitle}
            </h2>
            <p className="text-sm text-text-muted">
              {resume.yearTitle} ·{' '}
              {formatTimeRemaining(resume.estimatedMinutesRemaining)} remaining
            </p>
            <div className="pt-2">
              <Progress value={resume.progress} className="h-1.5" />
            </div>
          </div>

          <Link href={`/labs/${resume.labId}`} className="md:self-auto">
            <Button className="whitespace-nowrap" size="lg">
              Resume
            </Button>
          </Link>
        </CardContent>
      </div>
    </Card>
  )
}
