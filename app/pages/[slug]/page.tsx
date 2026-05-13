import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'

interface PageProps {
  params: { slug: string }
}

export async function generateMetadata({ params }: PageProps) {
  const supabase = await createClient()
  const { data: page } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!page) {
    return { title: 'Page Not Found' }
  }

  return {
    title: `${page.title} | WaW`,
    description: page.description,
    openGraph: {
      title: page.title,
      description: page.description,
      type: 'website',
    },
  }
}

export default async function PublicPage({ params }: PageProps) {
  const supabase = await createClient()

  // Fetch published page with blocks and images
  const { data: page } = await supabase
    .from('custom_pages')
    .select(
      `
      *,
      blocks:page_blocks(
        *,
        image:page_images(*)
      )
    `
    )
    .eq('slug', params.slug)
    .eq('is_published', true)
    .single()

  if (!page) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <PageRenderer page={page} />
    </main>
  )
}
