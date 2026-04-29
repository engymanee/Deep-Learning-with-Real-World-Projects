/**
 * Server-side cover derivation for Library resources.
 *
 * When an admin doesn't upload a cover image, this module tries to
 * pull a sensible one straight off the resource URL so the card
 * doesn't fall back to a plain icon. Strategies, in order:
 *
 *   1. **YouTube / youtu.be / shorts** - the canonical thumbnail
 *      URL on `img.youtube.com` is deterministic from the video id,
 *      so we don't need a network round trip. `hqdefault.jpg` is
 *      used because it's guaranteed to exist for every public
 *      video; `maxresdefault.jpg` is sometimes a 404 placeholder.
 *
 *   2. **Direct image URLs** - if the URL itself points at an
 *      image (extension or content-type), we just use it. Lets an
 *      admin paste a Cloudinary/CDN image URL as the resource.
 *
 *   3. **Generic web pages** - GET the URL, read up to 256 KB of
 *      HTML (everything we need lives in <head>), and pull the
 *      first usable image meta tag we can find. We try, in order:
 *      og:image, og:image:secure_url, twitter:image,
 *      twitter:image:src, itemprop=image, link rel=image_src.
 *      Relative URLs are resolved against the page URL.
 *
 * Anything that times out, 404s, returns non-HTML content, or has
 * no usable meta tag returns null - the caller persists NULL on
 * `cover_url` and the existing icon fallback renders. This keeps
 * the feature opportunistic: it never blocks a save and never
 * surfaces a derivation error to the admin.
 *
 * Diagnostic logs are written with the `[v0]` prefix so the dev
 * server / Vercel function logs can be filtered down to just this
 * module when something isn't deriving as expected.
 *
 * NOTE: pure PDF URLs (e.g. arxiv.org/pdf/1234.5678.pdf with no
 * HTML wrapper) currently fall through to null because rendering
 * the first page server-side requires a heavy native canvas
 * dependency that isn't a great fit for a serverless function.
 * Common arXiv-style /abs/ landing pages, Google Drive previews,
 * Notion shares, etc. all expose `og:image` and are handled.
 */

const FETCH_TIMEOUT_MS = 8_000
const MAX_HTML_BYTES = 512 * 1024
// Pose as a current desktop Chrome. A bot-flavoured UA gets soft
// blocked / cloaked by Cloudflare, Medium, X, and a long tail of
// other hosts, which would silently leave us with no og:image to
// extract. The Accept-Language header keeps locale-routing CDNs
// from sending us a redirect chain.
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

// File extensions that should be treated as a direct image. Used
// both for the URL-shape shortcut and for screening relative og:image
// resolutions.
const IMAGE_EXTENSIONS = /\.(?:jpe?g|png|webp|gif|avif|svg)(?:\?|#|$)/i

/**
 * Derive a cover image URL from a resource URL. Returns null when
 * no plausible image could be found - the caller should leave the
 * row's `cover_url` NULL in that case.
 */
export async function deriveCoverFromUrl(url: string): Promise<string | null> {
  if (!url || typeof url !== 'string') return null

  // Tier 1: YouTube. Pure URL math - no network call.
  const yt = youtubeThumbnail(url)
  if (yt) {
    console.log('[v0] derive-cover: youtube hit', { url, yt })
    return yt
  }

  // Tier 2: URL itself ends in an image extension. The `new URL`
  // guard rejects malformed input before we hand it back.
  if (IMAGE_EXTENSIONS.test(url)) {
    try {
      const direct = new URL(url).toString()
      console.log('[v0] derive-cover: direct image url', { url, direct })
      return direct
    } catch {
      /* fall through to og:image */
    }
  }

  // Tier 3: og:image / twitter:image / image_src from the HTML head.
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
 * Fetch the URL and pull the first usable image meta tag. Capped
 * at MAX_HTML_BYTES because everything we need is in <head>;
 * reading further is wasted bandwidth and memory.
 */
async function fetchOgImage(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  let response: Response
  try {
    response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        // A few CDNs vary their response on this; sending an empty
        // string keeps us out of any "from another page" rules.
        Referer: '',
      },
      redirect: 'follow',
      cache: 'no-store',
    })
  } catch (e) {
    clearTimeout(timeoutId)
    console.log('[v0] derive-cover: fetch failed', {
      url,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  }
  clearTimeout(timeoutId)

  if (!response.ok || !response.body) {
    console.log('[v0] derive-cover: bad response', {
      url,
      status: response.status,
      hasBody: !!response.body,
    })
    return null
  }

  const contentType = (response.headers.get('content-type') ?? '').toLowerCase()

  // If the URL itself returned an image, just use the (possibly
  // redirected) final URL. Covers cases like a CDN that serves
  // images without an extension.
  if (contentType.startsWith('image/')) {
    try {
      await response.body.cancel()
    } catch {
      /* ignore */
    }
    console.log('[v0] derive-cover: response is an image', {
      url,
      finalUrl: response.url,
      contentType,
    })
    return response.url || url
  }

  // Anything other than HTML doesn't carry og tags. Drain and bail.
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
    try {
      await response.body.cancel()
    } catch {
      /* ignore */
    }
    console.log('[v0] derive-cover: non-html content', { url, contentType })
    return null
  }

  // Stream the body and stop as soon as we either have </head>
  // (case-insensitive) or hit the byte cap. Bounded memory.
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
      if (/<\/head>/i.test(html)) break
    }
    // Final flush so any trailing multi-byte chars are decoded.
    html += decoder.decode()
  } catch (e) {
    console.log('[v0] derive-cover: stream read failed', {
      url,
      error: e instanceof Error ? e.message : String(e),
    })
    return null
  } finally {
    try {
      await reader.cancel()
    } catch {
      /* ignore */
    }
  }

  const result = extractMetaImage(html, response.url || url)
  console.log('[v0] derive-cover: extract result', {
    url,
    bytesRead: received,
    found: result,
  })
  return result
}

/**
 * Pull the first usable image URL out of an HTML blob. Tolerant of
 * attribute order (`property` before `content` and vice versa),
 * single or double quotes, extra whitespace, and the secure / src
 * variants. Returns an absolute https? URL, or null.
 *
 * Exported for unit testing - callers should use deriveCoverFromUrl.
 */
export function extractMetaImage(html: string, baseUrl: string): string | null {
  // Limit the search window to <head> when possible; some pages
  // include `og:image` references inside articles/scripts as
  // example text, which we don't want to pick up. Case-insensitive.
  const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)
  const haystack = headMatch ? headMatch[1] : html

  // Each pattern captures the URL in group 1. Order matters: prefer
  // og:image (largest, most reliable), then secure variants, then
  // twitter:image, then itemprop, then <link rel="image_src">.
  const patterns: RegExp[] = [
    // og:image (both attribute orders)
    /<meta[^>]+property\s*=\s*["']og:image["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image["']/i,
    // og:image:secure_url
    /<meta[^>]+property\s*=\s*["']og:image:secure_url["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image:secure_url["']/i,
    // og:image:url (less common but spec-valid)
    /<meta[^>]+property\s*=\s*["']og:image:url["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image:url["']/i,
    // twitter:image
    /<meta[^>]+name\s*=\s*["']twitter:image["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?name\s*=\s*["']twitter:image["']/i,
    // twitter:image:src (older Twitter card spec)
    /<meta[^>]+name\s*=\s*["']twitter:image:src["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?name\s*=\s*["']twitter:image:src["']/i,
    // schema.org itemprop
    /<meta[^>]+itemprop\s*=\s*["']image["'][^>]*?content\s*=\s*["']([^"']+)["']/i,
    /<meta[^>]+content\s*=\s*["']([^"']+)["'][^>]*?itemprop\s*=\s*["']image["']/i,
    // <link rel="image_src">
    /<link[^>]+rel\s*=\s*["']image_src["'][^>]*?href\s*=\s*["']([^"']+)["']/i,
    /<link[^>]+href\s*=\s*["']([^"']+)["'][^>]*?rel\s*=\s*["']image_src["']/i,
  ]

  for (const pattern of patterns) {
    const match = haystack.match(pattern)
    if (!match || !match[1]) continue
    const candidate = decodeHtmlEntities(match[1].trim())
    if (!candidate) continue
    try {
      const resolved = new URL(candidate, baseUrl).toString()
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
