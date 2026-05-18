import type { Metadata } from 'next'
import { Cardo, Vollkorn, Alegreya_SC, Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/lib/user-context'
import { getCurrentUser } from '@/lib/auth-server'
import { AdminPreviewBanner } from '@/components/admin/preview-banner'
import './globals.css'

// Skip prerendering for the entire app since it requires Supabase which may not be available at build time
export const dynamic = 'force-dynamic'

const _cardo = Cardo({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cardo',
  display: 'swap',
})

const _vollkorn = Vollkorn({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-vollkorn',
  display: 'swap',
})

const _alegreyaSC = Alegreya_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-alegreya',
  display: 'swap',
})

const _inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
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
  const user = await getCurrentUser()

  return (
    <html
      lang="en"
      className={`${_cardo.variable} ${_vollkorn.variable} ${_alegreyaSC.variable} ${_inter.variable} bg-[var(--color-paper)]`}
    >
      <body
        suppressHydrationWarning
        className="font-cardo text-[var(--color-ink)] antialiased"
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
