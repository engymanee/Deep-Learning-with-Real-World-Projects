import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireAdmin } from '@/lib/auth-server'
import {
  Users,
  LayoutDashboard,
  ArrowLeft,
  Building2,
  BookOpen,
  Megaphone,
  MessagesSquare,
} from 'lucide-react'
import { TopBar } from '@/components/top-bar'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // requireAdmin always evaluates the real underlying account, ignoring
  // any active "preview as fellow" cookie. This keeps the admin console
  // reachable even while the admin is currently previewing the platform
  // as a fellow on other surfaces.
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-12">
        <header className="flex flex-col gap-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Admin
            </p>
            <h1 className="text-pretty text-3xl font-serif text-foreground">
              Program administration
            </h1>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-border">
          <AdminTab href="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" />
          <AdminTab href="/admin/users" icon={<Users className="h-4 w-4" />} label="Users" />
          <AdminTab href="/admin/schools" icon={<Building2 className="h-4 w-4" />} label="Schools" />
          <AdminTab
            href="/admin/curriculum"
            icon={<BookOpen className="h-4 w-4" />}
            label="Curriculum"
          />
          <AdminTab
            href="/admin/community"
            icon={<MessagesSquare className="h-4 w-4" />}
            label="Community"
          />
          <AdminTab
            href="/admin/announcements"
            icon={<Megaphone className="h-4 w-4" />}
            label="Announcements"
          />
        </nav>

        <main>{children}</main>
      </div>
    </div>
  )
}

function AdminTab({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-medium text-muted-foreground hover:border-foreground/20 hover:text-foreground"
    >
      {icon}
      {label}
    </Link>
  )
}
