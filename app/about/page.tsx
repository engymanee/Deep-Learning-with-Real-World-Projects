import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/top-bar'
import { PageRenderer } from '@/components/custom-pages/page-renderer'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'WaW Fellows Portal | About',
  description:
    'Welcome to the WaW Fellows Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function AboutPage() {
  await requireUser()

  const supabase = await createClient()

  // Fetch the About page from custom_pages
  const { data: page, error } = await supabase
    .from('custom_pages')
    .select(
      `
      id,
      title,
      slug,
      description,
      is_published,
      page_blocks (
        id,
        block_type,
        content,
        metadata,
        order_number
      )
    `
    )
    .eq('slug', 'about')
    .eq('is_published', true)
    .single()

  if (error || !page) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        <PageRenderer page={page} />
      </main>
    </div>
  )
}
