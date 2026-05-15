'use client'

import Link from 'next/link'
import Image from 'next/image'
import Markdown from 'react-markdown'
import { ArrowRight } from 'lucide-react'
import { CustomPage, PageBlock } from '@/lib/custom-pages/types'
import { Footer } from '@/components/footer'

interface PageRendererProps {
  page: CustomPage
  showCTA?: boolean
}

export function PageRenderer({ page, showCTA = true }: PageRendererProps) {
  const blocks = page.blocks || []
  
  // Determine if we have any headers to render
  // Only render database headers if we have NO blocks (blocks contain their own header sections)
  const hasAnyHeader = (page.header1 || page.header2 || page.header3) && blocks.length === 0

  // Render header based on position
  const renderHeader = (content: string | null, position: string | undefined, size: 'large' | 'medium' | 'small') => {
    if (!content || position === 'hidden') return null

    const sizeClasses = {
      large: 'text-4xl sm:text-5xl',
      medium: 'text-2xl sm:text-3xl',
      small: 'text-lg sm:text-xl',
    }

    return (
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="text-center space-y-4">
            <h2 className={`font-serif ${sizeClasses[size]} text-foreground font-bold`}>
              {content}
            </h2>
          </div>
        </div>
      </section>
    )
  }

  return (
    <main className="w-full">
      {/* Cover Image - Display at top if available */}
      {page.cover_image_url && (
        <section className="w-full relative h-64 sm:h-96 bg-muted overflow-hidden">
          <Image
            src={page.cover_image_url}
            alt={page.title}
            fill
            className="object-cover"
            priority
          />
        </section>
      )}
      
      {/* Headers positioned BEFORE blocks - only render if no blocks exist */}
      {blocks.length === 0 && page.header1_position === 'before' && renderHeader(page.header1, 'before', 'large')}
      {blocks.length === 0 && page.header2_position === 'before' && renderHeader(page.header2, 'before', 'medium')}
      {blocks.length === 0 && page.header3_position === 'before' && renderHeader(page.header3, 'before', 'small')}

      {/* Body Content Blocks */}
      {blocks.length === 0 ? (
        hasAnyHeader ? null : (
          <section className="bg-background">
            <div className="py-12 text-center text-muted-foreground max-w-4xl mx-auto">
              <p>No content available for this page.</p>
            </div>
          </section>
        )
      ) : (
        <div>
          {blocks.map((block) => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </div>
      )}

      {/* Headers positioned AFTER blocks - only render if no blocks exist */}
      {blocks.length === 0 && page.header1_position === 'after' && renderHeader(page.header1, 'after', 'large')}
      {blocks.length === 0 && page.header2_position === 'after' && renderHeader(page.header2, 'after', 'medium')}
      {blocks.length === 0 && page.header3_position === 'after' && renderHeader(page.header3, 'after', 'small')}

      {/* Optional Subtitle Section - Only show if description exists */}
      {page.description && (
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <p className="text-base text-muted-foreground leading-relaxed text-center italic">
              {page.description}
            </p>
          </div>
        </section>
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
      const format = metadata.format
      const size = metadata.size
      
      // Special format: header section (welcome section with h1 + 2 paragraphs)
      if (format === 'header_section') {
        const lines = (block.content || '').split('\n\n').filter(Boolean)
        const [h1, p1, p2] = lines
        
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
              <div className="space-y-6">
                <div>
                  <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4 text-center">
                    {h1}
                  </h1>
                  <p className="text-lg text-foreground font-medium mb-3 text-center">
                    {p1}
                  </p>
                  <p className="text-base text-muted-foreground leading-relaxed text-center">
                    {p2}
                  </p>
                </div>
              </div>
            </div>
          </section>
        )
      }
      
      // Special format: prose section (multiple paragraphs)
      if (format === 'prose_section') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
                {(block.content || '').split('\n\n').map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </section>
        )
      }

      // Size-based text rendering (for backward compatibility)
      if (size === 'large') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
              <h2 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4 text-center">
                {block.content}
              </h2>
            </div>
          </section>
        )
      } else if (size === 'medium') {
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <p className="text-lg text-foreground font-medium mb-3 text-center">
                {block.content}
              </p>
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
        // Default text rendering with Markdown support
        return (
          <section className="border-b border-border bg-card">
            <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
              <div className="prose prose-neutral prose-sm max-w-none">
                <Markdown
                  components={{
                    h3: ({ children }) => (
                      <h3 className="text-center">{children}</h3>
                    ),
                  }}
                >
                  {block.content || ''}
                </Markdown>
              </div>
            </div>
          </section>
        )
      }
    }

    case 'image': {
      const containerClass = metadata.containerClass || 'py-8 sm:py-12'
      const imageClass = metadata.className || 'w-full rounded-lg shadow-md'
      const sectionClass = metadata.section || 'bg-background'
      
      return (
        <section className={sectionClass}>
          <div className={`mx-auto max-w-4xl px-4 ${containerClass}`}>
            <img
              src={block.content || ''}
              alt={metadata.alt || 'Page image'}
              className={imageClass}
              style={metadata.style}
            />
          </div>
        </section>
      )
    }

    case 'cta': {
      const containerClass = metadata.containerClass || 'py-8 sm:py-12'
      const sectionClass = metadata.section || 'bg-background'
      const href = metadata.href || '#'
      
      return (
        <section className={sectionClass}>
          <div className={`mx-auto max-w-4xl px-4 ${containerClass}`}>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={href}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90 transition-opacity"
              >
                {block.content}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )
    }

    default:
      return null
  }
}
