'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ExternalLink } from 'lucide-react'
import { recordLinkClick } from '@/app/(curriculum)/phases/actions'

/**
 * Embed descriptor for a resource URL. Either an iframe-based embed
 * (YouTube / Vimeo / Loom) or a native <video> source for direct
 * media files. Anything else returns null so the caller can fall
 * back to a plain "open in new tab" CTA.
 */
type Embed =
  | { kind: 'iframe'; src: string }
  | { kind: 'native'; src: string }

/**
 * Best-effort URL → embed mapping. Kept inline here so the
 * detection and rendering live in the same module - if we ever add a
 * provider, both halves are updated together.
 */
function getVideoEmbed(url: string): Embed | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  const host = parsed.hostname.replace(/^www\./, '')

  // YouTube. Handles /watch?v=, /shorts/<id>, /embed/<id>, plus the
  // youtu.be short-link host.
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const v = parsed.searchParams.get('v')
    if (v) return { kind: 'iframe', src: `https://www.youtube.com/embed/${v}` }
    const shorts = parsed.pathname.match(/^\/shorts\/([\w-]+)/)
    if (shorts) {
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${shorts[1]}` }
    }
    const embed = parsed.pathname.match(/^\/embed\/([\w-]+)/)
    if (embed) {
      return { kind: 'iframe', src: `https://www.youtube.com/embed/${embed[1]}` }
    }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.replace(/^\//, '')
    if (id) return { kind: 'iframe', src: `https://www.youtube.com/embed/${id}` }
  }

  // Vimeo
  if (host === 'vimeo.com' || host === 'player.vimeo.com') {
    const id = parsed.pathname.match(/\/(\d+)/)?.[1]
    if (id) return { kind: 'iframe', src: `https://player.vimeo.com/video/${id}` }
  }

  // Loom
  if (host === 'loom.com') {
    const id = parsed.pathname.match(/^\/(?:share|embed)\/([a-f0-9]+)/i)?.[1]
    if (id) return { kind: 'iframe', src: `https://www.loom.com/embed/${id}` }
  }

  // Direct video file. Covers self-hosted assets and Supabase Storage
  // public URLs ending in a known extension.
  if (/\.(mp4|webm|ogg|mov|m4v)(\?|$)/i.test(parsed.pathname)) {
    return { kind: 'native', src: url }
  }

  return null
}

/**
 * Whether the given URL is something we know how to render inline.
 * Server-safe (pure URL parsing), used by the item page to decide
 * between an embed and a link button.
 */
export function isEmbeddableVideo(url: string): boolean {
  return getVideoEmbed(url) !== null
}

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
