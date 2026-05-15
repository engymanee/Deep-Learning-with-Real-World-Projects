import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/top-bar'
import type { CustomPage } from '@/lib/custom-pages/types'

export async function LayoutWrapper({ children }: { children: React.ReactNode }) {
  // Fetch custom pages server-side during layout rendering
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
    console.error('[v0] Error fetching custom pages in layout:', error)
  }

  return (
    <>
      <TopBar customPages={customPages} />
      {children}
    </>
  )
}
