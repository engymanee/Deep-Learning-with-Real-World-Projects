import { headers } from 'next/headers'

/**
 * Returns the canonical absolute origin for the running app, with no
 * trailing slash. Prefers an explicitly configured NEXT_PUBLIC_SITE_URL
 * (set this in production for stable invite/notification links) and
 * falls back to the inbound request's host so preview deployments keep
 * working without extra config.
 *
 * If neither is available (e.g. in a background job with no request
 * context and no env var) we return null so callers can skip generating
 * absolute links rather than crashing.
 */
export async function getSiteOrigin(): Promise<string | null> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured) return configured.replace(/\/$/, '')

  try {
    const h = await headers()
    const host = h.get('x-forwarded-host') ?? h.get('host')
    const proto = h.get('x-forwarded-proto') ?? 'https'
    if (host) return `${proto}://${host}`
  } catch {
    // headers() throws outside a request scope; fall through to null.
  }

  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`

  return null
}

/**
 * Builds an absolute URL on the site for the given path. Returns null
 * if no origin is available (see getSiteOrigin) so callers can decide
 * whether to fail loudly or silently skip the link.
 */
export async function siteUrl(path: string): Promise<string | null> {
  const origin = await getSiteOrigin()
  if (!origin) return null
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${origin}${normalized}`
}
