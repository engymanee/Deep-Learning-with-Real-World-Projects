import type { Metadata } from 'next'
import { Lora, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/lib/user-context'
import { getCurrentUser } from '@/lib/auth-server'
import { AdminPreviewBanner } from '@/components/admin/preview-banner'
import './globals.css'

// Skip prerendering for the entire app since it requires Supabase which may not be available at build time
export const dynamic = 'force-dynamic'

const _serif = Lora({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-serif',
})

const _sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
})

export const metadata: Metadata = {
  title: 'WaW Fellows Portal',
  description: 'The Wisdom at Work Fellowship portal for professional development and leadership learning',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  let user = null
  try {
    user = await getCurrentUser()
  } catch (error) {
    // If Supabase client initialization fails (e.g., missing env vars),
    // continue rendering the app without user data. This allows the app
    // to render even during preview phase when env vars might not be fully available.
    console.error('[v0] Failed to get current user:', error)
  }

  return (
    <html lang="en" className="bg-background">
      {/* `suppressHydrationWarning` here is scoped to <body> only -
          it silences the false-positive caused by browser extensions
          (Grammarly, LastPass, etc.) that inject `data-gr-*` /
          `data-lastpass-*` attributes after the server HTML is
          delivered. Real hydration mismatches anywhere else in the
          tree still surface as warnings. */}
      <body
        suppressHydrationWarning
        className={`${_sans.variable} ${_serif.variable} font-sans antialiased`}
      >
        <UserProvider initialUser={user}>
          {user?.preview && (
            <AdminPreviewBanner
              label={user.preview.label}
              mode={user.preview.mode}
              actualAdminName={user.preview.actualAdminName}
            />
          )}
          {children}
        </UserProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
