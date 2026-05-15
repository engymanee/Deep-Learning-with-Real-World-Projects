import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PageRenderer } from '@/components/custom-pages/page-renderer'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Revalidate every 10 seconds to ensure changes appear immediately
export const revalidate = 10

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()
  const { data: page } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', slug)
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
  const { slug } = await params
  const supabase = await createClient()

  // Fetch published page with blocks
  const { data: page, error: pageError } = await supabase
    .from('custom_pages')
    .select('*')
    .eq('slug', slug)
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

  return (
    <div className="min-h-screen bg-background">
      <PageRenderer page={{ ...page, blocks }} />
    </div>
  )
}
