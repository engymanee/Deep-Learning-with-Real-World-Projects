import Link from 'next/link'
import { TopBar } from '@/components/top-bar'
import { Footer } from '@/components/footer'

interface CustomPageTemplateProps {
  metadata?: {
    title: string
    description?: string
  }
  children: React.ReactNode
}

/**
 * Reusable template for custom pages that matches the About page layout exactly.
 * Provides TopBar, Footer, and consistent spacing/styling structure.
 */
export function CustomPageTemplate({ metadata, children }: CustomPageTemplateProps) {
  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        {children}
        <Footer />
      </main>
    </div>
  )
}
