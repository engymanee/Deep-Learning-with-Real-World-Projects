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

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full">
        {/* Welcome header section */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
            <div className="space-y-6">
              <div>
                <h1 className="font-serif text-3xl sm:text-4xl text-foreground font-bold mb-4">
                  Welcome to the Wisdom at Work Fellows&apos; Portal
                </h1>
                <p className="text-lg text-foreground font-medium mb-3 text-center">
                  Congratulations and welcome to the Wisdom at Work Fellowship!
                </p>
                <p className="text-base text-muted-foreground leading-relaxed text-center">
                  This site is your dashboard for the WAW Syllabus, Learning Journals, Additional Resources.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Foundation disclaimer image */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-H1sYQI5iHCd7niCFvKbRdSYILwL5U1.png"
              alt="This project was made possible through the support of Grant 63617 from the John Templeton Foundation"
              className="w-full rounded-lg"
            />
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

        {/* Three paragraphs about Wisdom at Work initiative */}
        <section className="border-b border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
            <div className="prose prose-sm max-w-none space-y-4 text-muted-foreground">
              <p>
                School leaders face myriad challenges: handling angry parent emails, managing contentious meetings, and addressing bullying—often before the school day even begins. Each situation demands nuanced thinking and sound judgment, not one-size-fits-all answers. How do school leaders learn to move from reactive mode to calm, wise responses?
              </p>
              <p>
                Our new initiative, Wisdom at Work, aims to answer that question. We view practical wisdom (phronesis)—the disposition to press pause, deliberate, and respond well—as the antidote to reactive decision-making. Practical wisdom enables leaders to attend to context, engage stakeholders meaningfully, and navigate competing priorities—turning everyday challenges into opportunities to foster flourishing.
              </p>
              <p>
                Rooted in innovative, research-based design, the Wisdom at Work Fellowship will equip school leaders and their teams with tools and practices they can use to lead with wisdom, even under pressure. Over few years, we will grow a vibrant Community of Fellows—engaging school leaders not just as participants, but as partners in research and design. Together, we are shaping a fresh, field-tested model of professional development, building evidence-based tools, and cultivating a networked Community of Practice.
              </p>
            </div>
          </div>
        </section>

        {/* Three-year curriculum structure image */}
        <section className="bg-background">
          <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 text-center text-sm">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-b8MnjRcwfx4lrP2uHyE4GYgMWOaAas.png"
              alt="Wisdom at Work Three-Year Curriculum Structure: Year One Deep Learning, Year Two Execution & Brokering, Year Three WAW Fellows Networked Community of Practice"
              className="w-full rounded-lg shadow-md"
            />
          </div>
        </section>

        {/* Foundation attribution section */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16 text-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-kCoiFTogFnqrrOloeNsvOSi9SOMEDN.png"
              alt="John Templeton Foundation"
              className="h-32 w-auto inline-block"
              style={{ fontSize: '20px' }}
            />
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
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        <Footer />
      </main>
    </div>
  )
}
