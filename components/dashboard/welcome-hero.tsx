import { Bookmark } from 'lucide-react'

interface WelcomeHeroProps {
  fellowName?: string
  lastSeenAt?: string | null
}

export function WelcomeHero({ fellowName, lastSeenAt }: WelcomeHeroProps) {
  const isFirstLogin = !lastSeenAt

  if (isFirstLogin) {
    // First-time login design
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Bookmark className="h-6 w-6 text-primary" />
          </div>
          <h1 className="font-sans text-4xl font-bold text-foreground">
            Welcome to the Wisdom at Work Fellows&apos; Portal
          </h1>
        </div>

        <div className="space-y-3 pl-16">
          <h2 className="text-xl font-bold text-foreground">
            Congratulations and welcome to the Wisdom at Work Fellowship!
          </h2>
          <p className="text-base text-muted-foreground">
            This site is your dashboard for the WAW Syllabus, Learning Journals, and Additional
            Resources. Everything you need to succeed in your fellowship journey is organized here.
          </p>
        </div>
      </div>
    )
  }

  // Returning user design
  return (
    <div className="space-y-3">
      <h1 className="font-serif text-4xl font-bold text-primary">
        Welcome back, {fellowName}
      </h1>
      <p className="text-lg text-muted-foreground">
        Pick up where you left off - choose a content item from the curriculum on the left.
      </p>
    </div>
  )
}
