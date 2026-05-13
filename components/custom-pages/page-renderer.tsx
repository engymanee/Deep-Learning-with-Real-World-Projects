'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CustomPage, PageBlock, PageImage } from '@/lib/custom-pages/types'

interface PageRendererProps {
  page: CustomPage
  showCTA?: boolean
}

export function PageRenderer({ page, showCTA = true }: PageRendererProps) {
  const blocks = page.blocks || []

  return (
    <article className="w-full">
      {/* Content Blocks */}
      {blocks.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground max-w-4xl mx-auto">
          <p>No content available for this page.</p>
        </div>
      ) : (
        <div>
          {blocks.map((block) => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </div>
      )}

      {/* Call to action footer */}
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
    </article>
  )
}

interface RenderBlockProps {
  block: PageBlock & { image?: PageImage | null }
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
              <div className="space-y-6 text-center">
                <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4">
                  {block.content}
                </h1>
              </div>
            </div>
          </section>
        )
      } else if (size === 'medium') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <div className="text-center space-y-4">
                <p className="text-lg text-foreground font-medium">{block.content}</p>
              </div>
            </div>
          </section>
        )
      } else if (size === 'small') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
              <p className="text-base text-muted-foreground leading-relaxed text-center">{block.content}</p>
            </div>
          </section>
        )
      } else {
        // Default text rendering
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

    case 'combined':
      return (
        <section className="bg-accent/20 rounded-lg p-6 space-y-4">
          {block.title && (
            <h2 className="font-serif text-2xl font-bold text-foreground">
              {block.title}
            </h2>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Text Content */}
            {block.content && (
              <div className="prose prose-sm max-w-none">
                {block.content.split('\n\n').map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            )}

            {/* Image Content */}
            {block.image && (
              <div className="relative w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={block.image.url}
                  alt={block.image.alt_text || 'Section image'}
                  width={block.image.width || 400}
                  height={block.image.height || 400}
                  priority={false}
                  loading="lazy"
                  className="w-full h-auto"
                />
              </div>
            )}
          </div>
        </section>
      )

    default:
      return null
  }
}
