import Link from 'next/link'
import {
  BookOpen,
  Building2,
  CalendarDays,
  Library,
  Megaphone,
  MessagesSquare,
  Users,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Card, CardContent } from '@/components/ui/card'

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
  await requireAdmin()

  return (
    <div className="flex flex-col gap-8">
      {/* Greeting */}
      <section>
        <h1 className="text-balance font-serif text-4xl text-foreground">
          Welcome Back, Admin
        </h1>
      </section>

      {/* Quick management actions */}
      <section>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
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
            href="/admin/library"
            icon={<Library className="h-5 w-5" />}
            title="Library"
            description="Add, edit, and remove curated books, videos, podcasts, and other resources. Gate by cohort or publish as Recommended Resources."
          />
          <ActionCard
            href="/admin/community"
            icon={<MessagesSquare className="h-5 w-5" />}
            title="Community"
            description="Moderate posts and events surfaced in the fellow community feed."
          />
          <ActionCard
            href="/admin/notifications"
            icon={<Megaphone className="h-5 w-5" />}
            title="Notifications"
            description="Send announcements, reminders, and alerts. Targeted by cohort, school team, or specific fellows. Optionally email."
          />
          <ActionCard
            href="/admin/schedule"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Scheduling"
            description="Create scheduling polls, invite specific fellows to vote on availability, and finalize event times like WhenToMeet."
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
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {icon}
          </span>
          <p className="font-serif text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs leading-tight text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
