/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      // Server Actions cap request bodies at 1 MB by default, which
      // is smaller than the 5 MB ceiling our own validation allows
      // for avatar / resource-cover uploads. Without this override,
      // any reasonable photo (e.g. a phone headshot) is rejected at
      // the framework boundary with a 413 before our action runs.
      // 6 MB leaves headroom for the file plus the accompanying
      // text fields in the same multipart payload.
      bodySizeLimit: '6mb',
    },
  },
}

export default nextConfig
