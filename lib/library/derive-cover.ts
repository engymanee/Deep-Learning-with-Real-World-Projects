/**
 * Server-side cover derivation for Library resources.
 *
 * When an admin doesn't upload a cover image, this module tries to
 * pull a sensible one straight off the resource URL so the card
 * doesn't fall back to a plain icon. Two strategies, in order:
 *
 *   1. **YouTube / youtu.be / shorts** - the canonical thumbnail
 *      URL on `img.youtube.com` is deterministic from the video id,
 *      so we don't need a network round trip. `hqdefault.jpg` is
 *      used because it's guaranteed to exist for every public
 *      video; `maxresdefault.jpg` is sometimes a 404 placeholder.
 *
 *   2. **Generic web pages** - GET the URL, read up to 256 KB of
 *      HTML (everything we need lives in <head>), and pull the
 *      first `og:image` / `og:image:secure_url` / `twitter:image`
 *      / `twitter:image:src` value we can find. Relative URLs are
 *      resolved against the page URL.
 *
 * Anything that times out, 404s, returns non-HTML content, or has
 * no usable meta tag returns null - the caller persists NULL on
 * `cover_url` and the existing icon fallback renders. This keeps
 * the feature opportunistic: it never blocks a save and never
 * surfaces a derivation error to the admin.
 *
 * NOTE: pure PDF URLs (e.g. arxiv.org/pdf/1234.5678.pdf with no
 * HTML wrapper) currently fall through to null because rendering
 * the first page server-side requires a heavy native canvas
 * dependency that isn't a great fit for a serverless function. The
 * common arXiv-style /abs/ landing pages, Google Drive previews,
 * Notion shares, etc. all expose `og:image` and are handled.
 */

const FETCH_TIMEOUT_MS = 5_000
const MAX_HTML_BYTES = 256 * 1024
// Pretend to be a regular browser. Some sites (Cloudflare, Medium)
// return a stub page or 403 to obvious bot user agents, which would
// give us nothing to parse.
const USER_AGENT =
  'Mozilla/5.0 (compatible; LibraryCoverBot/1.0; +https://hbi.fellowship)'

/**
 * Derive a cover image URL from a resource URL. Returns null when
 * no plausible image could be found - the caller should leave the
 * row's `cover_url` NULL in that case.
 */
export async function deriveCoverFromUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null

  // Tier 1: YouTube. Pure URL math - no network call.
  const yt = youtubeThumbnail(url)
  if (yt) return yt

  // Tier 2: og:image / twitter:image from the HTML head.
  return await fetchOgImage(url)
}

/**
 * Extract the YouTube video id from any of the common URL shapes
 * (`watch?v=`, `youtu.be/`, `/embed/`, `/shorts/`, `/live/`) and
 * return its `hqdefault.jpg` thumbnail URL. Returns null for
 * anything we can't parse confidently - we'd rather fall through
 * to the og:image fetch than guess.
 */
function youtubeThumbnail(url: string): string | null {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }

  const host = parsed.hostname.replace(/^www\./, '')
  let id: string | null = null

  if (host === 'youtu.be') {
    // Path is `/<id>` for short links. Strip any trailing path
    // segments (e.g. start time fragments).
    id = parsed.pathname.split('/').filter(Boolean)[0] ?? null
  } else if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname === '/watch') {
      id = parsed.searchParams.get('v')
    } else {
      const m = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/]+)/)
      if (m) id = m[1]
    }
  }

  if (!id) return null
  // YouTube ids are 11 characters of [A-Za-z0-9_-]. Reject anything
  // that doesn't fit so a malformed URL can't poison the cover URL.
  if (!/^[\w-]{11}$/.test(id)) return null

  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

/**
 * Fetch the URL and pull the first usable open-graph / twitter
 * image meta tag. Capped at MAX_HTML_BYTES because everything we
 * need is in <head>; reading further is wasted bandwidth and
 * memory.
 */
async function fetchOgImage(url: string): Promise<string | null> {
  // AbortController gives us a hard ceiling on the request - some
  // pages stream HTML slowly and we don't want a save to block on
  // a slow CDN.
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
      // No cache: the admin just typed this URL, the latest version
      // of the page is what we want.
      cache: 'no-store',
    })
  } catch {
    clearTimeout(timeoutId)
    return null
  }
  clearTimeout(timeoutId)

  if (!response.ok || !response.body) return null

  // Skip non-HTML content (binary downloads, PDFs without a landing
  // page, etc). og tags only live in HTML.
  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('text/html')) {
    // Drain the body so the connection can be reused.
    try {
      await response.body.cancel()
    } catch {
      /* ignore */
    }
    return null
  }

  // Stream the body and stop as soon as we either have </head> or
  // hit the byte cap. This keeps memory bounded for huge pages.
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8', { fatal: false })
  let html = ''
  let received = 0

  try {
    while (received < MAX_HTML_BYTES) {
      const { value, done } = await reader.read()
      if (done) break
      received += value.byteLength
      html += decoder.decode(value, { stream: true })
      if (html.includes('</head>')) break
    }
  } catch {
    return null
  } finally {
    // Best-effort cancel; the underlying connection is closed
    // automatically once we drop the reader.
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
  }

  return extractMetaImage(html, url)
}

/**
 * Pull the first `og:image` / `twitter:image` URL out of an HTML
 * blob and resolve it against the page URL. Tolerant of attribute
 * order (`property` before `content` and vice versa), single or
 * double quotes, and the `:secure_url` / `:src` variants.
 *
 * Exported for unit testing - callers should use deriveCoverFromUrl.
 */
export function extractMetaImage(html: string, baseUrl: string): string | null {
  // Limit the search window to <head> when possible; some pages
  // include `og:image` references inside articles/scripts as
  // example text, which we don't want to pick up.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const haystack = headMatch ? headMatch[1] : html

  // Each pattern captures the URL in group 1. Order matters: prefer
  // og:image (largest, most reliable), then secure variants, then
  // twitter:image as a backstop.
  const patterns: RegExp[] = [
    /<meta[^>]+property\s*=\s*["']og:image["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image["']/i,
    /<meta[^>]+property\s*=\s*["']og:image:secure_url["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image:secure_url["']/i,
    /<meta[^>]+name\s*=\s*["']twitter:image["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?name\s*=\s*["']twitter:image["']/i,
    /<meta[^>]+name\s*=\s*["']twitter:image:src["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?name\s*=\s*["']twitter:image:src["']/i,
  ]

  for (const pattern of patterns) {
    const match = haystack.match(pattern)
    if (!match || !match[1]) continue
    const candidate = decodeHtmlEntities(match[1].trim())
    if (!candidate) continue
    // Resolve relative URLs against the page URL. If even that
    // fails, the meta tag was junk - try the next pattern.
    try {
      const resolved = new URL(candidate, baseUrl).toString()
      // Reject obviously invalid schemes (data:, javascript:, etc.).
      if (!/^https?:\/\//i.test(resolved)) continue
      return resolved
    } catch {
      continue
    }
  }

  return null
}

/**
 * Tiny HTML entity decoder for the handful of escapes that show up
 * in URL-bearing meta content (`&amp;` is the big one). We don't
 * need a full DOM parser for this - the values are URLs, not prose.
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
}
