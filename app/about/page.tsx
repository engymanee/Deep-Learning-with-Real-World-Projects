import Link from 'next/link'
import { requireUser } from '@/lib/auth-server'
import { StandalonePageTemplate } from '@/components/custom-pages/standalone-page-template'
import { getAdminPageContent } from '@/app/admin/actions'

// Skip prerendering since this page requires authentication
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'WaW Fellowship | Wisdom at Work',
  description:
    'Welcome to the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

interface ContentBlock {
  id: string
  block_type: 'text' | 'image' | 'text_image'
  title: string | null
  content: string
  image_url: string | null
  image_alt: string | null
}

function renderContentBlock(block: ContentBlock) {
  switch (block.block_type) {
    case 'text':
      return (
        <div key={block.id} className="space-y-2">
          {block.title && <h3 className="font-semibold text-lg text-foreground">{block.title}</h3>}
          <p className="text-base text-muted-foreground leading-relaxed">{block.content}</p>
        </div>
      )
    case 'image':
      return (
        <div key={block.id}>
          <img
            src={block.image_url || ''}
            alt={block.image_alt || 'Content image'}
            className="w-full rounded-lg shadow-md"
          />
        </div>
      )
    case 'text_image':
      return (
        <div key={block.id} className="grid md:grid-cols-2 gap-6 items-center">
          <div className="space-y-2">
            {block.title && <h3 className="font-semibold text-lg text-foreground">{block.title}</h3>}
            <p className="text-base text-muted-foreground leading-relaxed">{block.content}</p>
          </div>
          <img
            src={block.image_url || ''}
            alt={block.image_alt || 'Content image'}
            className="w-full rounded-lg shadow-md"
          />
        </div>
      )
    default:
      return null
  }
}

export default async function AboutPage() {
  await requireUser()
  
  // Fetch editable body content blocks
  const bodyContent = await getAdminPageContent('about', 'body')
  
  // Show edit features only if user is admin (indicated by successful fetch)
  const isAdmin = bodyContent.ok
  const blocks: ContentBlock[] = bodyContent.ok ? bodyContent.data : []

  return (
    <StandalonePageTemplate>
      {/* Edit link - only show to admins */}
      {isAdmin && (
        <div className="mb-4 flex justify-end px-4">
          <a href="/admin/about" className="text-sm underline hover:opacity-80">
            Edit Page
          </a>
        </div>
      )}

      {/* Welcome header section */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4 text-center">
                Welcome to the Wisdom at Work Fellows&apos; Portal
              </h1>
              <p className="text-lg text-foreground font-medium mb-3 text-center">
                Congratulations and welcome to the{' '}
                <Link href="#" className="underline hover:opacity-80">
                  Wisdom at Work Fellowship
                </Link>
                !
              </p>
              <p className="text-base text-muted-foreground leading-relaxed text-center">
                This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Editable body content blocks */}
      {blocks.length > 0 && (
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 space-y-12">
            {blocks.map(block => renderContentBlock(block))}
          </div>
        </section>
      )}

      {/* Foundation attribution section */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="sm:w-1/2">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                This project was made possible through the support of Grant 63617 from the John Templeton Foundation. The opinions expressed in this project are those of the grantee and do not necessarily reflect the views of the John Templeton Foundation.
              </p>
            </div>
            <div className="sm:w-1/2 text-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png"
                alt="John Templeton Foundation"
                className="h-40 w-auto inline-block"
              />
            </div>
          </div>
        </div>
      </section>
    </StandalonePageTemplate>
  )
}
