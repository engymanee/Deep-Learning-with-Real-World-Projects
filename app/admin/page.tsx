import Link from 'next/link'
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarDays,
  GraduationCap,
  Library,
  Megaphone,
  MessagesSquare,
  ShieldCheck,
  UserCog,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { COHORTS, type Cohort } from '@/lib/cohorts'
import { PreviewLauncher, type PreviewFellow } from '@/components/admin/preview-launcher'

type FellowProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  cohort: string | null
  schools: { name: string | null } | null
  created_at: string | null
}

type AnnouncementRow = {
  id: string
  title: string
  published_at: string
}

type ResourceRow = { id: string; cohorts: string[] | null }

const fmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

function relativeTime(iso: string | null): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return fmt.format(new Date(iso))
}

export default async function AdminHomePage() {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // Pull everything we need in parallel.
  const [
    fellowsRes,
    facilitatorsCount,
    schoolsCount,
    schoolTeamsCount,
    yearsCount,
    labsCount,
    resourcesRes,
    announcementsRes,
    recentFellowsRes,
  ] = await Promise.all([
    // Fellows: full set so we can drive the launcher search + the cohort
    // breakdown without a second round trip.
    supabase
      .from('profiles')
      .select('id, full_name, email, cohort, created_at, schools(name)')
      .eq('role', 'fellow')
      .is('deactivated_at', null)
      .order('full_name', { ascending: true, nullsFirst: false })
      .returns<FellowProfileRow[]>(),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'facilitator'),
    supabase.from('schools').select('id', { count: 'exact', head: true }),
    supabase.from('cohorts').select('id', { count: 'exact', head: true }),
    supabase.from('years').select('id', { count: 'exact', head: true }),
    supabase.from('labs').select('id', { count: 'exact', head: true }),
    supabase.from('community_resources').select('id, cohorts').returns<ResourceRow[]>(),
    supabase
      .from('announcements')
      .select('id, title, published_at')
      .order('published_at', { ascending: false })
      .limit(4)
      .returns<AnnouncementRow[]>(),
    supabase
      .from('profiles')
      .select('id, full_name, email, cohort, created_at, schools(name)')
      .eq('role', 'fellow')
      .order('created_at', { ascending: false, nullsFirst: false })
      .limit(5)
      .returns<FellowProfileRow[]>(),
  ])

  const fellows = fellowsRes.data ?? []
  const recentFellows = recentFellowsRes.data ?? []
  const announcements = announcementsRes.data ?? []
  const resources = resourcesRes.data ?? []

  const fellowsCount = fellows.length
  const fellowsWithCohort = fellows.filter((f) => f.cohort).length
  const fellowsWithoutCohort = fellowsCount - fellowsWithCohort

  // Fellows per cohort
  const cohortCounts: Record<Cohort, number> = { A: 0, B: 0, C: 0 }
  for (const f of fellows) {
    if (f.cohort && (COHORTS as readonly string[]).includes(f.cohort)) {
      cohortCounts[f.cohort as Cohort] += 1
    }
  }

  // Resources per cohort (cohorts is text[], may overlap multiple cohorts)
  const resourcesByCohort: Record<Cohort, number> = { A: 0, B: 0, C: 0 }
  let unassignedResources = 0
  for (const r of resources) {
    const list = r.cohorts ?? []
    if (list.length === 0) {
      unassignedResources += 1
      continue
    }
    for (const c of list) {
      if ((COHORTS as readonly string[]).includes(c)) {
        resourcesByCohort[c as Cohort] += 1
      }
    }
  }

  const launcherFellows: PreviewFellow[] = fellows.map((f) => ({
    id: f.id,
    fullName: f.full_name ?? f.email ?? 'Unnamed fellow',
    email: f.email,
    cohort: (COHORTS as readonly string[]).includes(f.cohort ?? '')
      ? (f.cohort as Cohort)
      : null,
    schoolName: f.schools?.name ?? null,
  }))

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting + identity strip */}
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Admin console
          </p>
          <h2 className="text-balance font-serif text-3xl text-foreground">
            Welcome back, {admin.fullName.split(' ')[0]}
          </h2>
          <p className="max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            A live snapshot of the program. Manage people, content, and community
            from one place - or drop into a fellow&apos;s view to see exactly what
            they see.
          </p>
        </div>
      </section>

      {/* KPI grid */}
      <section
        aria-label="Program overview"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <KpiCard
          icon={<GraduationCap className="h-4 w-4" />}
          label="Fellows"
          value={fellowsCount}
          sub={
            fellowsWithoutCohort > 0
              ? `${fellowsWithoutCohort} not in a cohort`
              : 'All in cohorts'
          }
          subTone={fellowsWithoutCohort > 0 ? 'warning' : 'success'}
          href="/admin/users"
        />
        <KpiCard
          icon={<UserCog className="h-4 w-4" />}
          label="Facilitators"
          value={facilitatorsCount.count ?? 0}
          sub="Coaches & graders"
          href="/admin/users"
        />
        <KpiCard
          icon={<Building2 className="h-4 w-4" />}
          label="Schools"
          value={schoolsCount.count ?? 0}
          sub={`${schoolTeamsCount.count ?? 0} school teams`}
          href="/admin/schools"
        />
        <KpiCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Content items"
          value={labsCount.count ?? 0}
          sub={`Across ${yearsCount.count ?? 0} phase${yearsCount.count === 1 ? '' : 's'}`}
          href="/admin/curriculum"
        />
      </section>

      {/* Two-column: cohort breakdown + preview launcher */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="font-serif text-lg">Cohort breakdown</CardTitle>
              <CardDescription>
                Fellows and assigned library resources per cohort.
              </CardDescription>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Manage <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {COHORTS.map((c) => {
              const fellowsHere = cohortCounts[c]
              const pct =
                fellowsCount === 0 ? 0 : Math.round((fellowsHere / fellowsCount) * 100)
              return (
                <div key={c} className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-foreground">Cohort {c}</p>
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{fellowsHere}</span>{' '}
                      fellow{fellowsHere === 1 ? '' : 's'}
                      <span className="mx-1.5">·</span>
                      {resourcesByCohort[c]} resource{resourcesByCohort[c] === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div
                    className="h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={pct}
                    aria-label={`Cohort ${c} share`}
                  >
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
            {(fellowsWithoutCohort > 0 || unassignedResources > 0) && (
              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Unassigned:</span>
                {fellowsWithoutCohort > 0 && (
                  <span>
                    {fellowsWithoutCohort} fellow{fellowsWithoutCohort === 1 ? '' : 's'}
                  </span>
                )}
                {fellowsWithoutCohort > 0 && unassignedResources > 0 && <span>·</span>}
                {unassignedResources > 0 && (
                  <span>
                    {unassignedResources} resource{unassignedResources === 1 ? '' : 's'}
                  </span>
                )}
                <span className="ml-auto">Hidden from every fellow until assigned.</span>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <PreviewLauncher fellows={launcherFellows} />
        </div>
      </section>

      {/* Two-column: recent fellows + recent announcements */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="font-serif text-lg">Recently added fellows</CardTitle>
              <CardDescription>The newest people in the program.</CardDescription>
            </div>
            <Link
              href="/admin/users"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              All users <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            {recentFellows.length === 0 ? (
              <EmptyState message="No fellows yet. Invite the first one to get started." />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {recentFellows.map((f) => (
                  <li
                    key={f.id}
                    className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                        {initialsFor(f.full_name ?? f.email ?? '?')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {f.full_name ?? 'Unnamed fellow'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {f.email ?? 'No email'}
                        {f.schools?.name ? ` · ${f.schools.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      {f.cohort &&
                      (COHORTS as readonly string[]).includes(f.cohort) ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                          Cohort {f.cohort}
                        </span>
                      ) : (
                        <span className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(f.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
            <div>
              <CardTitle className="font-serif text-lg">Recent announcements</CardTitle>
              <CardDescription>Latest broadcasts to the community.</CardDescription>
            </div>
            <Link
              href="/admin/announcements"
              className="inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              Manage <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </CardHeader>
          <CardContent>
            {announcements.length === 0 ? (
              <EmptyState message="No announcements yet. Post one to keep fellows in the loop." />
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {announcements.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-warning/15 text-warning">
                      <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">
                        {a.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <CalendarDays
                          className="mr-1 inline h-3 w-3"
                          aria-hidden="true"
                        />
                        {relativeTime(a.published_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick management actions */}
      <section>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Manage
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            href="/admin/users"
            icon={<Users className="h-5 w-5" />}
            title="Users & cohorts"
            description="Invite fellows, set roles, assign cohort labels, deactivate accounts."
          />
          <ActionCard
            href="/admin/schools"
            icon={<Building2 className="h-5 w-5" />}
            title="Schools & teams"
            description="Group fellows by school team for collaborative reporting and rosters."
          />
          <ActionCard
            href="/admin/curriculum"
            icon={<BookOpen className="h-5 w-5" />}
            title="Curriculum"
            description="Author phases, items, and content blocks. Assign each to one or more cohorts."
          />
          <ActionCard
            href="/admin/community"
            icon={<Library className="h-5 w-5" />}
            title="Library & community"
            description="Curate resources, events, and posts. Gate by cohort as needed."
          />
          <ActionCard
            href="/admin/announcements"
            icon={<Megaphone className="h-5 w-5" />}
            title="Announcements"
            description="Broadcast updates to fellows. Targeted by cohort or program-wide."
          />
          <ActionCard
            href="/community"
            icon={<MessagesSquare className="h-5 w-5" />}
            title="View community"
            description="Open the live community feed the way fellows see it (without preview)."
          />
        </div>
      </section>
    </div>
  )
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  subTone = 'muted',
  href,
}: {
  icon: React.ReactNode
  label: string
  value: number
  sub?: string
  subTone?: 'muted' | 'warning' | 'success'
  href?: string
}) {
  const subClass =
    subTone === 'warning'
      ? 'text-warning'
      : subTone === 'success'
        ? 'text-success'
        : 'text-muted-foreground'

  const inner = (
    <Card className="h-full transition-colors hover:border-foreground/20">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            {icon}
          </span>
          {href && (
            <ArrowUpRight
              className="h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="flex flex-col">
          <span className="text-3xl font-semibold text-foreground">{value}</span>
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        {sub && <p className={`text-xs ${subClass}`}>{sub}</p>}
      </CardContent>
    </Card>
  )

  if (href) {
    return (
      <Link href={href} className="group">
        {inner}
      </Link>
    )
  }
  return inner
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardContent className="flex h-full flex-col gap-2 p-5">
          <div className="flex items-center justify-between">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              {icon}
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground"
              aria-hidden="true"
            />
          </div>
          <p className="font-serif text-base font-medium text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-xs text-muted-foreground">
      {message}
    </p>
  )
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}
