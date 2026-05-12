import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth-server'
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
        <main>{children}</main>
      </div>
    </div>
  )
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin()

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 md:py-12">
        <main>{children}</main>
      </div>
    </div>
  )
}
