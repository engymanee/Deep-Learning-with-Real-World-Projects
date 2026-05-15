import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'
import { InlinePageEditor } from '@/components/custom-pages/inline-page-editor'

export const metadata = {
  title: 'WaW Fellowship | Wisdom at Work',
  description:
    'Welcome to the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
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
        title: 'About',
        slug: 'about',
        description: null,
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

    // Create blocks matching the EXACT original layout with ALL images:
    // 1. Welcome header section (h1 + 2 paragraphs)
    // 2. Foundation disclaimer image
    // 3. Team discussion image
    // 4. Three paragraphs about Wisdom at Work initiative
    // 5. Three-year curriculum structure image
    // 6. Foundation logo section
    // 7. Call to action button
    const blocks = [
      // Block 1: Welcome header section (h1 + 2 paragraphs combined)
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 1,
        title: null,
        content: 'Welcome to the Wisdom at Work Fellows\' Portal\n\nCongratulations and welcome to the Wisdom at Work Fellowship!\n\nThis site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.',
        metadata: {
          format: 'header_section',
        },
      },
      // Block 2: Foundation disclaimer image (Grant 63617)
      {
        page_id: page.id,
        block_type: 'image',
        order_number: 2,
        title: null,
        content: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-H1sYQI5iHCd7niCFvKbRdSYILwL5U1.png',
        metadata: {
          alt: 'This project was made possible through the support of Grant 63617 from the John Templeton Foundation',
          className: 'w-full rounded-lg',
          section: 'bg-background',
          containerClass: 'py-8 sm:py-12'
        },
      },
      // Block 3: Team discussion image
      {
        page_id: page.id,
        block_type: 'image',
        order_number: 3,
        title: null,
        content: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-f3pmyp3Y4Su3IunOJebJvDjlTXdzRP.png',
        metadata: {
          alt: 'Wisdom at Work Fellows in collaborative discussion',
          className: 'w-full rounded-lg shadow-md',
          section: 'bg-background',
          containerClass: 'py-8 sm:py-12'
        },
      },
      // Block 4: Three paragraphs about Wisdom at Work initiative
      {
        page_id: page.id,
        block_type: 'text',
        order_number: 4,
        title: null,
        content: 'School leaders face myriad challenges: handling angry parent emails, managing contentious meetings, and addressing bullying—often before the school day even begins. Each situation demands nuanced thinking and sound judgment, not one-size-fits-all answers. How do school leaders learn to move from reactive mode to calm, wise responses?\n\nOur new initiative, Wisdom at Work, aims to answer that question. We view practical wisdom (phronesis)—the disposition to press pause, deliberate, and respond well—as the antidote to reactive decision-making. Practical wisdom enables leaders to attend to context, engage stakeholders meaningfully, and navigate competing priorities—turning everyday challenges into opportunities to foster flourishing.\n\nRooted in innovative, research-based design, the Wisdom at Work Fellowship will equip school leaders and their teams with tools and practices they can use to lead with wisdom, even under pressure. Over few years, we will grow a vibrant Community of Fellows—engaging school leaders not just as participants, but as partners in research and design. Together, we are shaping a fresh, field-tested model of professional development, building evidence-based tools, and cultivating a networked Community of Practice.',
        metadata: {
          format: 'prose_section',
        },
      },
      // Block 5: Three-year curriculum structure image
      {
        page_id: page.id,
        block_type: 'image',
        order_number: 5,
        title: null,
        content: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-b8MnjRcwfx4lrP2uHyE4GYgMWOaAas.png',
        metadata: {
          alt: 'Wisdom at Work Three-Year Curriculum Structure: Year One Deep Learning, Year Two Execution & Brokering, Year Three WAW Fellows Networked Community of Practice',
          className: 'w-full rounded-lg shadow-md',
          section: 'bg-background',
          containerClass: 'py-8 sm:py-12'
        },
      },
      // Block 6: Foundation logo section
      {
        page_id: page.id,
        block_type: 'image',
        order_number: 6,
        title: null,
        content: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png',
        metadata: {
          alt: 'John Templeton Foundation',
          className: 'h-32 w-auto inline-block',
          section: 'border-t border-border bg-card',
          containerClass: 'py-12 sm:py-16 text-center',
          style: { fontSize: '20px' }
        },
      },
      // Block 7: Call to action button (Go to Dashboard)
      {
        page_id: page.id,
        block_type: 'cta',
        order_number: 7,
        title: null,
        content: 'Go to Dashboard',
        metadata: {
          href: '/dashboard',
          icon: 'ArrowRight',
          section: 'border-t border-border bg-background',
          containerClass: 'py-8 sm:py-12',
        },
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



