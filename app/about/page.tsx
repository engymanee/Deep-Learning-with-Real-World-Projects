import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'
import { InlinePageEditor } from '@/components/custom-pages/inline-page-editor'

export const metadata = {
  title: 'About the WaW Fellows Portal | Wisdom at Work',
  description:
    'Learn about the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function AboutPage() {
  const supabase = await createClient()

  // Fetch the about page using the exact same pattern as /pages/[slug]/page.tsx
  const { data: page, error: pageError } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', 'about')
    .eq('is_published', true)
    .single()

  if (pageError || !page) {
    notFound()
  }

  // Fetch page blocks separately
  const { data: blocks = [] } = await supabase
    .from('page_blocks')
    .select('*')
    .eq('page_id', page.id)
    .order('order_number', { ascending: true })

  // Check if user is admin for inline editing
  let userIsAdmin = false
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Check if user has admin role
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      userIsAdmin = profile?.role === 'admin'
    }
  } catch {
    // User not authenticated or profile check failed
  }

  const pageWithBlocks = { ...page, blocks }

  return (
    <div className="min-h-screen bg-background">
      {userIsAdmin ? (
        <InlinePageEditor page={pageWithBlocks} />
      ) : (
        <PageRenderer page={pageWithBlocks} />
      )}
    </div>
  )
}


