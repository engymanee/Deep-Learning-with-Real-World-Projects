import { Progress } from '@/components/ui/progress'
import { Lock } from 'lucide-react'
import type { DashboardYear } from '@/lib/dashboard-data'

export function ProgressColumn({ years }: { years: DashboardYear[] }) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-lg text-primary">Your progress</h3>
      <div className="space-y-4">
        {years.map((year) => (
          <div
            key={year.id}
            className={`space-y-2 p-4 rounded-lg border ${
              year.isLocked
                ? 'bg-bg-subtle border-border opacity-60'
                : 'bg-card border-border'
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-serif font-semibold text-primary">
                  {year.title}
                </span>
                {year.isLocked && (
                  <Lock className="w-4 h-4 text-text-muted" aria-label="Locked" />
                )}
              </div>
              <span className="text-xs text-text-muted whitespace-nowrap">
                {Math.round(year.progress)}% complete
              </span>
            </div>
            <Progress value={year.progress} className="h-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
