import Link from 'next/link'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import type { DashboardTeam } from '@/lib/dashboard-data'

export function TeamColumn({ team }: { team: DashboardTeam | null }) {
  if (!team) {
    return (
      <div className="space-y-4">
        <h3 className="font-serif text-lg text-primary">Your team</h3>
        <p className="text-sm text-text-muted">
          You&apos;re not yet assigned to a school team. Your facilitator will
          add you soon.
        </p>
      </div>
    )
  }

  const visible = team.members.slice(0, 6)

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-serif text-lg text-primary">Your team</h3>
        <p className="text-sm text-text mt-1">{team.cohortName}</p>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-text-muted">
          You&apos;re the only member of this school team so far.
        </p>
      ) : (
        <div className="space-y-3">
          {visible.map((member) => (
            <div key={member.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <Avatar className="w-6 h-6">
                  <AvatarFallback className="text-xs bg-bg-muted">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-text">{member.name}</span>
              </div>
              <Progress value={member.progress} className="h-1" />
            </div>
          ))}
        </div>
      )}

      <Link
        href="/team"
        className="text-accent hover:text-primary transition-colors text-sm inline-block"
      >
        View team →
      </Link>
    </div>
  )
}
