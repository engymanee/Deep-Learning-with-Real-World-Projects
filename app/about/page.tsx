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
            <h1 className="text-4xl font-bold mb-4">About</h1>
            <p className="text-lg text-muted-foreground">
              Welcome to the WaW Fellows Portal. This is your central hub for all learning materials, resources, and community engagement.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">What is this portal?</h2>
            <p className="text-muted-foreground">
              The WaW Fellows Portal provides a comprehensive learning experience with organized curriculum, access to library resources, and a vibrant community where you can connect with fellow participants.
            </p>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Key Features</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li className="flex gap-3">
                <span className="text-primary font-semibold">•</span>
                <span><strong>Dashboard:</strong> Your personal learning hub with progress tracking and quick access to materials</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">•</span>
                <span><strong>Library:</strong> Curated collection of resources to support your learning journey</span>
              </li>
              <li className="flex gap-3">
                <span className="text-primary font-semibold">•</span>
                <span><strong>Community:</strong> Connect with other fellows, share insights, and collaborate</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-semibold">Getting Started</h2>
            <p className="text-muted-foreground">
              Use the navigation menu at the top to explore different sections of the portal. Start with the Dashboard to see your current progress and available activities.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
