import type { Metadata } from 'next'
import { Cardo, Vollkorn, Alegreya_SC, Inter } from 'next/font/google'
import { Lora } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { UserProvider } from '@/lib/user-context'
import { getCurrentUser } from '@/lib/auth-server'
import { AdminPreviewBanner } from '@/components/admin/preview-banner'
import { SkipNav } from '@/components/skip-nav'
import './globals.css'

// Skip prerendering for the entire app since it requires Supabase which may not be available at build time
export const dynamic = 'force-dynamic'

/* AAI Brand Typography Stack */
const cardo = Cardo({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-cardo',
  display: 'swap',
})

const vollkorn = Vollkorn({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-vollkorn',
  display: 'swap',
})

const alegreyaSC = Alegreya_SC({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  variable: '--font-alegreya-sc',
  display: 'swap',
})

const interFont = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/* Legacy font for backward compatibility */
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
  const user = await getCurrentUser()

  return (
    <html 
      lang="en" 
      className="bg-background"
      style={{
        fontFamily: `${cardo.style.fontFamily}, ${vollkorn.style.fontFamily}, ${alegreyaSC.style.fontFamily}, ${interFont.style.fontFamily}`,
      }}
    >
      {/* `suppressHydrationWarning` here is scoped to <body> only -
          it silences the false-positive caused by browser extensions
          (Grammarly, LastPass, etc.) that inject `data-gr-*` /
          `data-lastpass-*` attributes after the server HTML is
          delivered. Real hydration mismatches anywhere else in the
          tree still surface as warnings. */}
      <body
        suppressHydrationWarning
        className={`${_sans.variable} ${_serif.variable} ${cardo.variable} ${vollkorn.variable} ${alegreyaSC.variable} ${interFont.variable} font-sans antialiased`}
      >
        <SkipNav />
        <UserProvider initialUser={user}>
          {user?.preview && (
            <AdminPreviewBanner
              label={user.preview.label}
              mode={user.preview.mode}
              actualAdminName={user.preview.actualAdminName}
            />
          )}
          <main id="main-content">
            {children}
          </main>
        </UserProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
