import type { ReactNode } from 'react'
import { requireAdmin } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'
import { AdminBreadcrumb } from '@/components/admin/admin-breadcrumb'
import { createClient } from '@/lib/supabase/server'
import type { CustomPage } from '@/lib/custom-pages/types'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // requireAdmin always evaluates the real underlying account, ignoring
  // any active "preview as fellow" cookie. This keeps the admin console
  // reachable even while the admin is currently previewing the platform
  // as a fellow on other surfaces.
  await requireAdmin()

  // Fetch custom pages server-side
  let customPages: CustomPage[] = []
  try {
    const supabase = await createClient()
    const { data: pages } = await supabase
      .from('custom_pages')
      .select('id, title, slug, description, is_published, show_in_menu')
      .eq('is_published', true)
      .eq('show_in_menu', true)
      .order('created_at', { ascending: false })
    
    customPages = pages || []
  } catch (error) {
    console.error('[v0] Error fetching custom pages:', error)
  }

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
