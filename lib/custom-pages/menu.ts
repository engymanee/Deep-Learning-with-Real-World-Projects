import { unstable_cache } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CustomPage } from '@/lib/custom-pages/types'

/**
 * Fetch published custom pages that should appear in the menu
 * This is cached with the 'custom-pages' tag and revalidated when pages are updated
 */
export const getMenuCustomPages = unstable_cache(
  async (): Promise<CustomPage[]> => {
    try {
      const supabase = await createClient()
      const { data: pages, error } = await supabase
        .from('custom_pages')
        .select('id, title, slug, description, is_published, show_in_menu')
        .eq('is_published', true)
        .eq('show_in_menu', true)
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('[v0] Error fetching custom pages:', error)
        return []
      }
      
      return pages || []
    } catch (error) {
      console.error('[v0] Error fetching custom pages:', error)
      return []
    }
  },
  ['custom-pages-menu'],
  {
    tags: ['custom-pages', 'navigation'],
    revalidate: 3600, // Revalidate every hour as fallback
  }
)
