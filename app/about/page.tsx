import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'
import { notFound } from 'next/navigation'

export default async function AboutPage() {
  try {
    const supabase = await createClient()
    
    // Fetch the about custom page
    const { data: page, error } = await supabase
      .from('custom_pages')
      .select(`
        id,
        title,
        slug,
        description,
        header1,
        header1_position,
        header2,
        header2_position,
        header3,
        header3_position,
        cover_image_url,
        is_published,
        show_in_menu,
        blocks:page_blocks (
          id,
          page_id,
          block_type,
          order_number,
          title,
          content,
          image_id,
          metadata,
          created_at,
          updated_at
        ),
        created_by,
        created_at,
        updated_at
      `)
      .eq('slug', 'about')
      .eq('is_published', true)
      .single()

    if (error || !page) {
      // If the about page doesn't exist, show 404
      // Admins can create it at /admin/custom-pages
      notFound()
    }

    return <PageRenderer page={page} />
  } catch (error) {
    console.error('[v0] Error loading about page:', error)
    notFound()
  }
}

