import Link from 'next/link'
import {
  BookOpen,
  Building2,
  CalendarDays,
  Library,
  Megaphone,
  MessagesSquare,
  Users,
  Mail,
  FileText,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Card, CardContent } from '@/components/ui/card'
import { AdminDashboardClient } from '@/components/admin/admin-dashboard-client'
import { getAdminPageContent } from './actions'

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

  // Fetch editable content slots
  const topContent = await getAdminPageContent('admin', 'top')
  const bottomContent = await getAdminPageContent('admin', 'bottom')

  return (
    <AdminDashboardClient
      adminName={admin.fullName}
      topItems={topContent.ok ? topContent.data : []}
      bottomItems={bottomContent.ok ? bottomContent.data : []}
    />
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
