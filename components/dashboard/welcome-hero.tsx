import { Award } from 'lucide-react'

interface WelcomeHeroProps {
  fellowName?: string
  lastSeenAt?: string | null
}

export function WelcomeHero({ fellowName, lastSeenAt }: WelcomeHeroProps) {
  const isFirstLogin = !lastSeenAt

  return (
    <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary/5 via-background to-background p-8 sm:p-12">
      {/* Decorative background element */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />

      {/* Content */}
      <div className="relative space-y-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3">
            <Award className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            {isFirstLogin ? (
              <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
                Welcome to the Wisdom at Work Fellows&apos; Portal
              </h1>
            ) : (
              <h1 className="font-serif text-3xl font-bold text-foreground sm:text-4xl">
                Welcome back, {fellowName} to the Wisdom at Work Fellowship!
              </h1>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {isFirstLogin ? (
            <>
              <p className="text-lg font-semibold text-foreground">
                Congratulations and welcome to the Wisdom at Work Fellowship!
              </p>
              <p className="text-base leading-relaxed text-muted-foreground">
                This site is your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources. Everything you need to succeed in your fellowship journey is organized here.
              </p>
            </>
          ) : (
            <>
              <p className="text-base leading-relaxed text-muted-foreground">
                This site is your dashboard for the WAW Syllabus, Learning Journals, and Additional Resources. Everything you need to succeed in your fellowship journey is organized here.
              </p>
              <p className="text-lg font-semibold text-foreground">
                Pick up from where you stopped
              </p>
            </>
          )}
        </div>

        {/* Quick links to main resources */}
        <div className="grid gap-3 pt-4 sm:grid-cols-3">
          <div className="rounded-md border border-border/50 bg-background/50 p-4 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">WAW Syllabus</p>
            <p className="text-xs text-muted-foreground">Navigate your curriculum</p>
          </div>
          <div className="rounded-md border border-border/50 bg-background/50 p-4 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">Learning Journals</p>
            <p className="text-xs text-muted-foreground">Track your progress</p>
          </div>
          <div className="rounded-md border border-border/50 bg-background/50 p-4 backdrop-blur-sm">
            <p className="text-sm font-medium text-foreground">Resources</p>
            <p className="text-xs text-muted-foreground">Find PWF Protocols</p>
          </div>
        </div>
      </div>
    </div>
  )
}
