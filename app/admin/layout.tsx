import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { requireUser } from '@/lib/auth-server'
import { Users, LayoutDashboard, ArrowLeft, Building2 } from 'lucide-react'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  if (user.role !== 'admin') {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-background">
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
