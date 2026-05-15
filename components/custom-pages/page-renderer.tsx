'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CustomPage, PageBlock } from '@/lib/custom-pages/types'
import { Footer } from '@/components/footer'

interface PageRendererProps {
  page: CustomPage
  showCTA?: boolean
}

export function PageRenderer({ page, showCTA = true }: PageRendererProps) {
  const blocks = page.blocks || []

  return (
    <main className="w-full">
      {/* Welcome header section - matches About page */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4">
                {page.title}
              </h1>
              {page.description && (
                <p className="text-base text-muted-foreground leading-relaxed text-center">
                  {page.description}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content Blocks */}
      {blocks.length === 0 ? (
        <section className="bg-background">
          <div className="py-12 text-center text-muted-foreground max-w-4xl mx-auto">
            <p>No content available for this page.</p>
          </div>
        </section>
      ) : (
        <div>
          {blocks.map((block) => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </div>
      )}

      {/* Call to action footer - matches About page */}
      {showCTA && (
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90 transition-opacity"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      <Footer />
    </main>
  )
}

interface RenderBlockProps {
  block: PageBlock
}

function RenderBlock({ block }: RenderBlockProps) {
  // Parse metadata if it's a string
  const metadata = typeof block.metadata === 'string' ? JSON.parse(block.metadata || '{}') : (block.metadata || {})

  switch (block.block_type) {
    case 'text': {
      // Check if this is a heading based on metadata
      const isHeading = metadata.heading
      const size = metadata.size

      if (isHeading && size === 'large') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4">
                    {block.content}
                  </h1>
                </div>
              </div>
            </div>
          </section>
        )
      } else if (size === 'medium') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <div className="space-y-6">
                <div>
                  <p className="text-lg text-foreground font-medium mb-3 text-center">
                    {block.content}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )
      } else if (size === 'small') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <p className="text-base text-muted-foreground leading-relaxed text-center">
                {block.content}
              </p>
            </div>
          </section>
        )
      } else {
        // Default text rendering - matches About page prose style
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
                {block.content &&
                  block.content.split('\n\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
              </div>
            </div>
          </section>
        )
      }
    }

    case 'image':
      return (
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 text-center text-sm">
            <img
              src={block.content || ''}
              alt={metadata.alt || 'Page image'}
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </section>
      )

    default:
      return null
  }
}
