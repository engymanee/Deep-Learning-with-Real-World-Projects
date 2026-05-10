'use client'

import { Star, TrendingUp, Award, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { WinsStats, FrameworkStats, WinsOverTime } from '@/lib/community/load-wins'
import type { CommunityPostListItem } from '@/components/community/post-feed'

interface WinsDashboardProps {
  stats: WinsStats
  frameworkStats: FrameworkStats[]
  winsOverTime: WinsOverTime[]
  recentWins: CommunityPostListItem[]
}

export function WinsDashboard({
  stats,
  frameworkStats,
  winsOverTime,
  recentWins,
}: WinsDashboardProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Award}
          label="Total Wins"
          value={stats.total.toString()}
          description="Celebrations shared"
        />
        <StatCard
          icon={Star}
          label="Avg Rating"
          value={`${stats.avgRating.toFixed(1)} / 5`}
          description="Community rating"
        />
        <StatCard
          icon={Calendar}
          label="This Month"
          value={stats.winsThisMonth.toString()}
          description="Wins in 30 days"
        />
        <StatCard
          icon={TrendingUp}
          label="Frameworks"
          value={frameworkStats.length.toString()}
          description="Practices being used"
        />
      </div>

      {/* Framework Breakdown */}
      {frameworkStats.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Wins by Framework
            </CardTitle>
            <CardDescription>
              How schools are applying each practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {frameworkStats.slice(0, 5).map((fw) => (
                <div key={fw.framework} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {fw.framework}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {fw.count} win{fw.count !== 1 ? 's' : ''}
                      </Badge>
                      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {fw.avgRating.toFixed(1)}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{
                        width: `${(fw.count / (frameworkStats[0]?.count || 1)) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Wins */}
      {recentWins.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-serif text-lg">
              Recent Wins
            </CardTitle>
            <CardDescription>
              Latest celebrations from the community
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recentWins.map((win) => (
                <li
                  key={win.id}
                  className="flex flex-col gap-1 rounded border border-border/50 p-3 text-sm"
                >
                  <p className="font-medium text-foreground line-clamp-1">
                    {win.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    By {win.author?.full_name || 'Anonymous'} •{' '}
                    {win.published_at
                      ? new Date(win.published_at).toLocaleDateString()
                      : 'Recently'}
                  </p>
                  {win.framework_resource && (
                    <Badge variant="secondary" className="w-fit text-xs">
                      {win.framework_resource.title}
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  description: string
}

function StatCard({ icon: Icon, label, value, description }: StatCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            <p className="font-serif text-2xl text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
