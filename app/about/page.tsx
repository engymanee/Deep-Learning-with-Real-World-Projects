import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'
import { InlinePageEditor } from '@/components/custom-pages/inline-page-editor'

export const metadata = {
  title: 'About the WaW Fellows Portal | Wisdom at Work',
  description:
    'Learn about the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

/**
 * Seed the about page with default content if it doesn't exist
 */
async function seedAboutPageIfNeeded(supabase: any) {
  try {
    // Check if about page exists
    const { data: existingPage } = await supabase
      .from('custom_pages')
      .select('id')
      .eq('slug', 'about')
      .maybeSingle()

    if (existingPage) {
      return // Page already exists
    }

    // Create the About page with original structure
    const { data: page, error: pageError } = await supabase
      .from('custom_pages')
      .insert({
        title: 'About the WaW Fellows Portal',
        slug: 'about',
        description: 'Learn about the Wisdom at Work Fellowship Portal and the curriculum',
        header1: null,
        header2: null,
        header3: null,
        cover_image_url: null,
        is_published: true,
        show_in_menu: true,
      })
      .select()
      .single()

    if (pageError || !page) {
      console.warn('[v0] Failed to auto-seed about page:', pageError)
      return
    }

    // Create the original About page blocks
    const blocks = [
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 1,
        title: null,
        content: 'Welcome to the Wisdom at Work Fellows\' Portal',
        metadata: { heading: true, size: 'large' },
      },
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 2,
        title: null,
        content: 'Congratulations and welcome to the Wisdom at Work Fellowship!',
        metadata: { size: 'medium' },
      },
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 3,
        title: null,
        content: 'This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.',
        metadata: { size: 'small' },
      },
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 4,
        title: null,
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.\n\nDuis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        metadata: {},
      },
    ]

    const { error: blocksError } = await supabase
      .from('page_blocks')
      .insert(blocks)

    if (blocksError) {
      console.warn('[v0] Failed to create about page blocks:', blocksError)
      // Delete the page if blocks creation fails
      await supabase.from('custom_pages').delete().eq('id', page.id)
    }
  } catch (error) {
    console.warn('[v0] Error during about page auto-seeding:', error)
    // Don't throw - just warn and continue
  }
}

export default async function AboutPage() {
  const supabase = await createClient()

  // Auto-seed the about page if it doesn't exist
  await seedAboutPageIfNeeded(supabase)

  // Fetch the about page
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



