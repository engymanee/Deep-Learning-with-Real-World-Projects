import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, GraduationCap, Building2, BookOpen, Megaphone } from 'lucide-react'

export default async function AdminHomePage() {
  const supabase = await createClient()

  const [{ count: fellowCount }, { count: facilitatorCount }, { count: cohortCount }] =
    await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'fellow'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'facilitator'),
      supabase.from('cohorts').select('id', { count: 'exact', head: true }),
    ])

  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground">
        Manage who has access to the program, assign roles, and set up the learning community.
        Additional tools for curriculum, library, and cohort progression will live here.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<GraduationCap className="h-5 w-5 text-primary" />}
          label="Fellows"
          value={fellowCount ?? 0}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Facilitators"
          value={facilitatorCount ?? 0}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5 text-primary" />}
          label="Cohorts"
          value={cohortCount ?? 0}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Link
            href="/admin/users"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            Manage users
          </Link>
          <Link
            href="/admin/schools"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Building2 className="h-4 w-4" />
            Manage schools &amp; teams
          </Link>
          <Link
            href="/admin/curriculum"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" />
            Edit curriculum
          </Link>
          <Link
            href="/admin/announcements"
            className="inline-flex w-fit items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent"
          >
            <Megaphone className="h-4 w-4" />
            Post announcement
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: number
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
          {icon}
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-semibold text-foreground">{value}</span>
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
      </CardContent>
    </Card>
  )
}
