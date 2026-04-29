'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { recordLinkClick } from '@/app/(curriculum)/phases/actions'
import { getVideoEmbed } from '@/lib/video-embed'

// Re-export the server-safe detector from its new home so existing
// callers that still import it from this module keep working. The
// real implementation lives in `lib/video-embed.ts` so server
// components can call it without crossing the RSC client boundary.
export { isEmbeddableVideo } from '@/lib/video-embed'

interface Props {
  contentId: string
  url: string
  /** Whether the current user has already opened the source. */
  alreadyClicked: boolean
}

/**
 * Inline video preview. Renders a 16:9 iframe (or native <video>)
 * and, on mount, records the link-click so the lesson completion
 * gate ("must open the resource") clears without requiring an
 * additional manual button press - reaching the embed *is* the open.
 */
export function VideoEmbed({ contentId, url, alreadyClicked }: Props) {
  const router = useRouter()
  const embed = getVideoEmbed(url)
  const [recorded, setRecorded] = useState(alreadyClicked)
  const [, startTransition] = useTransition()

  useEffect(() => {
    if (recorded || !embed) return
    setRecorded(true)
    startTransition(async () => {
      const res = await recordLinkClick(contentId)
      if (!res.ok) {
        setRecorded(false)
        return
      }
      router.refresh()
    })
  }, [embed, recorded, contentId, router])

  if (!embed) return null

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-lg border border-border bg-black">
        <div className="aspect-video">
          {embed.kind === 'iframe' ? (
            <iframe
              src={embed.src}
              title="Video preview"
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full border-0"
            />
          ) : (
            <video
              src={embed.src}
              controls
              preload="metadata"
              className="h-full w-full"
            />
          )}
        </div>
      </div>
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Open in new tab
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    </div>
  )
}
