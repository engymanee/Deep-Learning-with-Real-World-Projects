import Link from 'next/link'
import { requireUser } from '@/lib/auth-server'
import { StandalonePageTemplate } from '@/components/custom-pages/standalone-page-template'

// Skip prerendering since this page requires authentication
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'WaW Fellowship | Wisdom at Work',
  description:
    'Welcome to the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function AboutPage() {
  await requireUser()

  return (
    <StandalonePageTemplate>
      {/* Welcome header section */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="space-y-6">
            <div>
              <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4 text-center">
                Welcome to the Wisdom at Work Fellows&apos; Portal
              </h1>
              <p className="text-lg text-foreground font-medium mb-3 text-center">
                Congratulations and welcome to the{' '}
                <Link href="#" className="underline hover:opacity-80">
                  Wisdom at Work Fellowship
                </Link>
                !
              </p>
              <p className="text-base text-muted-foreground leading-relaxed text-center">
                This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Team discussion image */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-f3pmyp3Y4Su3IunOJebJvDjlTXdzRP.png"
            alt="Wisdom at Work Fellows in collaborative discussion"
            className="w-full rounded-lg shadow-md"
          />
        </div>
      </section>

      {/* Curriculum structure section */}
      <section className="bg-background">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <img
            src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-b8MnjRcwfx4lrP2uHyE4GYgMWOaAas.png"
            alt="Wisdom at Work Three-Year Curriculum Structure"
            className="w-full rounded-lg shadow-md"
          />
        </div>
      </section>

      {/* Foundation attribution section */}
      <section className="border-t border-border bg-card">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
            <div className="sm:w-1/2">
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                This project was made possible through the support of Grant 63617 from the John Templeton Foundation. The opinions expressed in this project are those of the grantee and do not necessarily reflect the views of the John Templeton Foundation.
              </p>
            </div>
            <div className="sm:w-1/2 text-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png"
                alt="John Templeton Foundation"
                className="h-40 w-auto inline-block"
              />
            </div>
          </div>
        </div>
      </section>
    </StandalonePageTemplate>
  )
}
