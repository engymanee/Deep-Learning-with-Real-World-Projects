/**
 * Pure URL → embed mapping for curriculum video resources.
 *
 * Lives in a server-safe module (no `'use client'`, no React, no
 * browser globals) so it can be imported from BOTH server
 * components (e.g. the curriculum item page, which uses it to
 * decide between rendering an inline embed and a plain link
 * button) and the `<VideoEmbed>` client component (which uses it
 * to render the actual iframe / native <video>).
 *
 * Previously this lived alongside `<VideoEmbed>` in
 * `components/curriculum/video-embed.tsx`, which is a `'use client'`
 * file — that meant the server page hit
 *   "Attempted to call isEmbeddableVideo() from the server but
 *    isEmbeddableVideo is on the client."
 * at request time and rendered the runtime error overlay
 * ("This page couldn't load. A server error occurred."). Moving
 * the detector here keeps server and client agreeing on the same
 * provider list while satisfying the RSC boundary.
 */

/**
 * Embed descriptor for a resource URL. Either an iframe-based embed
 * (YouTube / Vimeo / Loom) or a native <video> source for direct
 * media files. Anything else returns null so the caller can fall
 * back to a plain "open in new tab" CTA.
 */
export type VideoEmbedDescriptor =
  | { kind: 'iframe'; src: string }
  | { kind: 'native'; src: string }

/**
 * Best-effort URL → embed mapping. Returns null for any URL we
 * don't recognise; callers should fall back to a link button in
 * that case.
 */
export function getVideoEmbed(url: string): VideoEmbedDescriptor | null {
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
