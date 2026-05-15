import { createClient } from '@/lib/supabase/server'
import type { CustomPage } from '@/lib/custom-pages/types'

/**
 * Fetch published custom pages that should appear in the menu
 * This is used across layouts to ensure consistent menu rendering
 */
export async function getMenuCustomPages(): Promise<CustomPage[]> {
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
}
