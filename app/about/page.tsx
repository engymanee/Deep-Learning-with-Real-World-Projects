import { requireUser } from '@/lib/auth-server'
import { TopBar } from '@/components/top-bar'

export const metadata = {
  title: 'WaW Fellows Portal | About',
  description:
    'Welcome to the WaW Fellows Portal - your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources.',
}

export default async function AboutPage() {
  await requireUser()

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="w-full max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold mb-4">About WaW Fellows Portal</h1>
            <p className="text-lg text-muted-foreground">
              Welcome to the WaW Fellows Portal. This is your central hub for all learning materials, resources, and community engagement.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Our Mission</h2>
            <p className="text-muted-foreground">
              The WaW Fellows Portal is designed to empower learners with access to high-quality educational resources, mentorship opportunities, and a supportive community of fellow participants on their learning journey.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">What You'll Find Here</h2>
            <ul className="space-y-3 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-semibold">→</span>
                <div>
                  <strong>Dashboard:</strong> Your personalized learning hub with progress tracking, quick access to materials, and activity notifications.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">→</span>
                <div>
                  <strong>Library:</strong> Curated collection of educational resources, articles, videos, and tools to support your learning journey.
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">→</span>
                <div>
                  <strong>Community:</strong> Connect with fellow learners, share insights, ask questions, and collaborate on projects.
                </div>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Getting Started</h2>
            <p className="text-muted-foreground">
              Use the navigation menu at the top to explore different sections of the portal. Start with the Dashboard to see your current progress and available learning activities. Don&apos;t hesitate to reach out to the community if you have questions or need support.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
