import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'
import { Footer } from '@/components/footer'

// Skip prerendering since this page requires authentication
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'WaW Fellowship | Wisdom at Work',
  description:
    'Welcome to the Wisdom at Work Fellowship Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function AboutPage() {
  await requireUser()

  const wisdomLabs = [
    {
      date: 'November 12',
      number: 'One',
      title: 'Wise Leadership Begins with Taking People Seriously as Persons',
    },
    {
      date: 'January 7',
      number: 'Two',
      title: 'Ground Your Compass: Finding your True North Amidst Competing Values and Views',
    },
    {
      date: 'February 4',
      number: 'Three',
      title: 'Follow the Trailheads',
    },
    {
      date: 'March 4',
      number: 'Four',
      title: 'Navigate Challenges to Promote Character',
    },
    {
      date: 'April 8',
      number: 'Five',
      title: 'Anticipate and Deal with Magnetic Interference',
    },
  ]

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
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

        {/* Deep Learning Labs Section Header */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <h2 className="text-2xl font-bold text-center text-foreground mb-8 tracking-wide">
              WISDOM AT WORK - DEEP LEARNING LABS
            </h2>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12 justify-center">
              <button className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition-colors">
                Click Here for Recurring Zoom Link
              </button>
              <button className="bg-blue-700 text-white px-6 py-2 rounded hover:bg-blue-800 transition-colors">
                📋 View Companion Guide
              </button>
            </div>

            {/* Wisdom Labs List */}
            <div className="space-y-6">
              {wisdomLabs.map((lab, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-blue-700 mb-1">
                      Wisdom Lab {lab.number} - {lab.date}
                    </h3>
                    <p className="text-foreground">{lab.title}</p>
                  </div>
                  <button className="bg-blue-700 text-white px-4 py-2 rounded hover:bg-blue-800 transition-colors whitespace-nowrap">
                    Click Here
                  </button>
                </div>
              ))}
            </div>
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

        <Footer />
      </main>
    </div>
  )
}
