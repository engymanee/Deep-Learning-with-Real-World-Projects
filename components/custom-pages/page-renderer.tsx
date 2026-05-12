'use client'

import Image from 'next/image'
import { CustomPage, PageBlock, PageImage } from '@/lib/custom-pages/types'

interface PageRendererProps {
  page: CustomPage
}

export function PageRenderer({ page }: PageRendererProps) {
  const blocks = page.blocks || []

  return (
    <article className="prose prose-sm max-w-3xl mx-auto py-12 px-4">
      {/* Page Header */}
      <header className="mb-8">
        <h1 className="font-serif text-4xl font-bold text-foreground mb-2">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-lg text-muted-foreground">{page.description}</p>
        )}
      </header>

      {/* Content Blocks */}
      {blocks.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p>No content available for this page.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {blocks.map((block) => (
            <RenderBlock key={block.id} block={block} />
          ))}
        </div>
      )}
    </article>
  )
}

interface RenderBlockProps {
  block: PageBlock & { image?: PageImage | null }
}

function RenderBlock({ block }: RenderBlockProps) {
  switch (block.block_type) {
    case 'text':
      return (
        <section className="space-y-4">
          {block.content && (
            <div className="prose prose-sm max-w-none">
              {block.content.split('\n\n').map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          )}
        </section>
      )

    case 'image':
      return (
        <figure className="my-6">
          {block.image && (
            <div className="relative w-full overflow-hidden rounded-lg bg-muted">
              <Image
                src={block.image.url}
                alt={block.image.alt_text || 'Page image'}
                width={block.image.width || 800}
                height={block.image.height || 600}
                priority={false}
                loading="lazy"
                className="w-full h-auto"
              />
            </div>
          )}
          {block.image?.alt_text && (
            <figcaption className="text-sm text-muted-foreground mt-2 text-center italic">
              {block.image.alt_text}
            </figcaption>
          )}
        </figure>
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
