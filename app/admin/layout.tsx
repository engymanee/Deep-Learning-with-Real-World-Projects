import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb'
import { getMenuCustomPages } from '@/lib/custom-pages/menu'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // requireAdmin always evaluates the real underlying account, ignoring
  // any active "preview as fellow" cookie. This keeps the admin console
  // reachable even while the admin is currently previewing the platform
  // as a fellow on other surfaces.
  await requireAdmin()
  const customPages = await getMenuCustomPages()

  return (
    <div className="min-h-screen bg-background">
      <TopBar customPages={customPages} />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-12">
        <AdminBreadcrumb />
        <main>{children}</main>
      </div>
    </div>
  )
}
