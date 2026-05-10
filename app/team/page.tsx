import { redirect } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  CalendarDays,
  ExternalLink,
  Lightbulb,
  MapPin,
  TrendingUp,
  Users,
} from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { loadTeamProgress } from '@/lib/team-progress'
import { loadTeamSidebar } from '@/lib/team-extras'
import { TopBar } from '@/components/top-bar'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { initialsFor } from '@/lib/types/profile'

export const metadata = {
  title: 'My Team | Leadership Fellowship',
  description:
    'See where your school team is in the curriculum and what they are reflecting on.',
}

/**
 * /team route - "My Team" dashboard.
 *
 * This is the team-shaped view of progress and engagement: the
 * curriculum-wide meters live in /dashboard, and the public
 * directory of every fellow lives in /community/bios. Here we
 * focus on the user's school team - their day-to-day
 * collaborators - and surface their progress, the next session,
 * and the reflections they've recently shared.
 */
export default async function TeamPage() {
  const user = await requireUser()

  // Without a school assignment the user has no "team" yet, so we
  // route them to /community where they can still find peers.
  if (!user.schoolTeamId) {
    redirect('/community')
  }

  const [progress, sidebar] = await Promise.all([
    loadTeamProgress(),
    loadTeamSidebar(),
  ])

  // Aggregate per-teammate progress across all phases. We average
  // the percent across the phases the team can see, weighted equally
  // so a fellow who is far in phase 1 but hasn't touched phase 3 gets
  // the partial credit they deserve.
  const teammateAverages = aggregateAverages(progress.phases)

  // The current user's own average percent, computed the same way
  // for symmetry with the teammate row.
  const myAverage = average(progress.phases.map((p) => p.me.percent))
  const teamAverage = average(
    teammateAverages.flatMap((t) => [t.percent]),
  )

  // Reflection share-rate over the last 30 days (already filtered to
  // visibility != private in the loader, only count's used here).
  const reflectionsThisMonth = sidebar.recentReflections.filter((r) => {
    const ts = new Date(r.created_at).getTime()
    return Date.now() - ts < 1000 * 60 * 60 * 24 * 30
  }).length

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
        <header className="flex flex-col gap-2 border-b border-border pb-6">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            My Team
          </p>
          <h1 className="font-serif text-3xl text-foreground text-balance sm:text-4xl">
            {user.schoolName}
          </h1>
          <p className="text-sm text-muted-foreground">
            {progress.teammateCount === 0
              ? 'No teammates have joined yet.'
              : progress.teammateCount === 1
                ? '1 teammate working alongside you.'
                : `${progress.teammateCount} teammates working alongside you.`}
          </p>
        </header>

        {/* Snapshot stat cards. */}
        <section className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            icon={<TrendingUp className="h-4 w-4" aria-hidden="true" />}
            label="Your progress"
            value={`${myAverage}%`}
            hint="Average across visible phases"
          />
          <StatCard
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            label="Team progress"
            value={`${teamAverage}%`}
            hint="Average teammate completion"
          />
          <StatCard
            icon={<Lightbulb className="h-4 w-4" aria-hidden="true" />}
            label="Reflections shared"
            value={String(reflectionsThisMonth)}
            hint="By teammates in the last 30 days"
          />
        </section>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Members + progress. */}
          <section className="lg:col-span-2">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-foreground">
                Team members
              </h2>
              <span className="text-xs text-muted-foreground">
                Sorted by progress
              </span>
            </div>
            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
              {teammateAverages.length === 0 ? (
                <p className="px-4 py-12 text-center text-sm text-muted-foreground">
                  Once your school cohort enrols, teammates will show up here
                  with their curriculum progress.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {teammateAverages.map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <Avatar className="h-9 w-9">
                        {t.avatarUrl && (
                          <AvatarImage src={t.avatarUrl} alt="" />
                        )}
                        <AvatarFallback>{t.initials}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {t.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatLastSeen(sidebar.lastSeenById.get(t.id))}
                          </p>
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <Progress value={t.percent} className="h-1.5" />
                          <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                            {t.percent}%
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Per-phase breakdown - keeps the meter cards from the
                original design while making each one click-through to
                the phase. */}
            {progress.phases.length > 0 && (
              <div className="mt-6">
                <h3 className="font-serif text-base text-foreground">
                  Phase progress
                </h3>
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {progress.phases.map((phase) => (
                    <li
                      key={phase.id}
                      className="rounded-lg border border-border bg-card p-4"
                    >
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-medium text-foreground">
                          {phase.title}
                        </p>
                        <Badge variant="outline" className="shrink-0">
                          {phase.itemCount} items
                        </Badge>
                      </div>
                      <div className="mt-3 space-y-2">
                        <PhaseMeter label="You" percent={phase.me.percent} />
                        <PhaseMeter
                          label="Team avg"
                          percent={average(
                            phase.teammates.map((t) => t.percent),
                          )}
                          muted
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          {/* Sidebar: next session + recent reflections. */}
          <aside className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <CalendarDays
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                <h3 className="font-serif text-base text-foreground">
                  Next session
                </h3>
              </div>
              {sidebar.upcomingSession ? (
                <div className="mt-2 flex flex-col gap-1.5">
                  <p className="text-sm font-medium text-foreground">
                    {sidebar.upcomingSession.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSessionTime(
                      sidebar.upcomingSession.starts_at,
                      sidebar.upcomingSession.ends_at,
                    )}
                  </p>
                  {sidebar.upcomingSession.location && (
                    <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" aria-hidden="true" />
                      {sidebar.upcomingSession.location}
                    </p>
                  )}
                  {sidebar.upcomingSession.meeting_url && (
                    <a
                      href={sidebar.upcomingSession.meeting_url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Join link
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  No upcoming sessions on the calendar.{' '}
                  <Link
                    href="/community/events"
                    className="text-primary hover:underline"
                  >
                    Browse all events
                  </Link>
                  .
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-base text-foreground">
                  Recent reflections
                </h3>
                <Link
                  href="/community/reflections"
                  className="inline-flex items-center gap-0.5 text-xs font-medium text-primary hover:underline"
                >
                  All
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </Link>
              </div>
              {sidebar.recentReflections.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Your team hasn&apos;t shared a reflection yet.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-3">
                  {sidebar.recentReflections.map((r) => (
                    <li key={r.id} className="flex gap-2">
                      <Avatar className="h-7 w-7 shrink-0">
                        {r.author?.avatar_url && (
                          <AvatarImage src={r.author.avatar_url} alt="" />
                        )}
                        <AvatarFallback>
                          {initialsFor(
                            r.author?.full_name ?? null,
                            r.author?.email ?? null,
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {r.author?.full_name ?? 'A teammate'}
                          </span>
                          {(r.lab_title || r.content_title) && (
                            <>
                              {' · '}
                              {r.lab_title ?? r.content_title}
                            </>
                          )}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-sm leading-relaxed text-foreground">
                          {r.body}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  )
}

/* ------------------------------ helpers ------------------------------ */

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 font-serif text-2xl tabular-nums text-foreground">
        {value}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function PhaseMeter({
  label,
  percent,
  muted = false,
}: {
  label: string
  percent: number
  muted?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={[
          'w-16 shrink-0 text-xs',
          muted ? 'text-muted-foreground' : 'text-foreground',
        ].join(' ')}
      >
        {label}
      </span>
      <Progress value={percent} className="h-1.5" />
      <span className="w-9 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {percent}%
      </span>
    </div>
  )
}

interface AggregatedTeammate {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  percent: number
}

/**
 * Average each teammate's percent across the visible phases. Sorted
 * desc so the most engaged collaborators surface first - matches the
 * "sorted by progress" hint in the table header.
 */
function aggregateAverages(
  phases: Awaited<ReturnType<typeof loadTeamProgress>>['phases'],
): AggregatedTeammate[] {
  const acc = new Map<string, AggregatedTeammate & { _sum: number; _n: number }>()
  for (const phase of phases) {
    for (const t of phase.teammates) {
      const existing = acc.get(t.id)
      if (existing) {
        existing._sum += t.percent
        existing._n += 1
      } else {
        acc.set(t.id, {
          id: t.id,
          name: t.name,
          initials: t.initials,
          avatarUrl: t.avatarUrl,
          percent: 0,
          _sum: t.percent,
          _n: 1,
        })
      }
    }
  }
  const list: AggregatedTeammate[] = []
  for (const v of acc.values()) {
    list.push({
      id: v.id,
      name: v.name,
      initials: v.initials,
      avatarUrl: v.avatarUrl,
      percent: v._n === 0 ? 0 : Math.round(v._sum / v._n),
    })
  }
  list.sort((a, b) => b.percent - a.percent || a.name.localeCompare(b.name))
  return list
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function formatLastSeen(ts: string | null | undefined): string {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const day = 1000 * 60 * 60 * 24
  if (diff < day) return 'active today'
  if (diff < day * 2) return 'active yesterday'
  if (diff < day * 30) return `active ${Math.floor(diff / day)}d ago`
  if (diff < day * 365) return `active ${Math.floor(diff / (day * 30))}mo ago`
  return 'inactive 1y+'
}

function formatSessionTime(start: string, end: string | null): string {
  const s = new Date(start)
  const dateStr = s.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const startTime = s.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  if (!end) return `${dateStr} · ${startTime}`
  const e = new Date(end)
  const endTime = e.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
  return `${dateStr} · ${startTime}–${endTime}`
}
