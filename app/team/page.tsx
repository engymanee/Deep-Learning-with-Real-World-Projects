import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'

export const metadata = {
  title: 'WaW Fellowship | Wisdom at Work',
  description:
    'Welcome to the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function TeamPage() {
  await requireUser()

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        {/* Welcome header section */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-4xl sm:text-5xl text-foreground font-bold mb-4">
                  Welcome to the Wisdom at Work Fellows&apos; Portal
                </h1>
                <p className="text-lg text-foreground font-medium mb-3">
                  Congratulations and welcome to the Wisdom at Work Fellowship!
                </p>
                <p className="text-base text-muted-foreground leading-relaxed">
                  This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* First image - team collaboration */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-yk9hNgyQQIeZ2sMEpmaQzrCr1BlN8x.png"
              alt="Wisdom at Work Fellows in collaborative discussion"
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </section>

        {/* Lorem Ipsum placeholder text */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
              </p>
              <p>
                Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </p>
              <p>
                Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.
              </p>
            </div>
          </div>
        </section>

        {/* Curriculum structure section */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-Q4wysyC8JWLi02dGNyrSqptIHF6gYQ.png"
              alt="Wisdom at Work Three-Year Curriculum Structure"
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </section>

        {/* Foundation attribution section */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <div className="flex flex-col lg:flex-row items-start lg:items-center gap-8">
              <div className="flex-1">
                <p className="italic text-foreground leading-relaxed mb-4">
                  This project was made possible through the support of Grant 63617 from the John Templeton Foundation. The opinions expressed in this project are those of the grantee and do not necessarily reflect the views of the John Templeton Foundation.
                </p>
              </div>
              <div className="flex-shrink-0 lg:text-right">
                <img
                  src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png"
                  alt="John Templeton Foundation"
                  className="h-32 w-auto"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Call to action footer */}
        <section className="border-t border-border bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-90 transition-opacity"
              >
                View Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/community"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-medium hover:border-primary/40 hover:text-primary transition-colors"
              >
                Join Community
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
