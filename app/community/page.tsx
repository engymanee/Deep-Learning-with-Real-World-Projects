import Link from 'next/link'
import { CalendarDays, ExternalLink, MapPin, Mic, FileText, Shield, BookMarked } from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { fellowCanAccess } from '@/lib/cohorts'
import { TopBar } from '@/components/top-bar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Fellow-facing Community of Practice hub. Intentionally simple:
 * upcoming events, latest posts (blog + podcast), and curated resources.
 * Admins see a "Manage" shortcut into /admin/community.
 */
export default async function CommunityPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const nowIso = new Date().toISOString()

  const [eventsRes, postsRes, resourcesRes] = await Promise.all([
    supabase
      .from('community_events')
      .select('id, title, description, starts_at, ends_at, location, join_url')
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(8),
    supabase
      .from('community_posts')
      .select('id, kind, title, excerpt, cover_url, media_url, published_at')
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(6),
    supabase
      .from('community_resources')
      .select('id, title, description, url, category, cohorts')
      .order('created_at', { ascending: false })
      .limit(12),
  ])

  const events = eventsRes.data ?? []
  const posts = postsRes.data ?? []
  // Fellows see only resources explicitly assigned to their cohort.
  // Resources with no cohort assignment are unassigned and hidden from
  // every fellow until an admin assigns them. Admins / facilitators
  // bypass the filter and see every resource so they can curate without
  // context-switching to /admin.
  const allResources = resourcesRes.data ?? []
  const resources =
    user.role === 'fellow'
      ? allResources.filter((r) => fellowCanAccess(r.cohorts as string[] | null, user.cohort))
      : allResources

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:py-14">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community of Practice
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="max-w-3xl text-pretty font-serif text-3xl text-foreground md:text-4xl">
              A shared space for ongoing practice
            </h1>
            {user.role === 'admin' && (
              <Button asChild variant="outline" size="sm">
                <Link href="/admin/community">
                  <Shield className="h-4 w-4" />
                  Manage
                </Link>
              </Button>
            )}
          </div>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Upcoming events, reflections from the field, podcasts, and resources to keep
            the wisdom alive between labs.
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Upcoming events</h2>
          </div>

          {events.length === 0 ? (
            <EmptyState copy="No events scheduled yet. Check back soon." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((ev) => (
                <EventCard key={ev.id} event={ev} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Practical wisdom in action</h2>
          </div>

          {posts.length === 0 ? (
            <EmptyState copy="No posts yet. Stories and episodes will land here soon." />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} />
              ))}
            </div>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl text-foreground">Shared library</h2>
          </div>

          {resources.length === 0 ? (
            <EmptyState copy="No resources curated yet." />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {resources.map((r) => (
                <ResourceRow key={r.id} resource={r} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function EventCard({
  event,
}: {
  event: {
    id: string
    title: string
    description: string | null
    starts_at: string
    ends_at: string | null
    location: string | null
    join_url: string | null
  }
}) {
  const start = new Date(event.starts_at)
  const end = event.ends_at ? new Date(event.ends_at) : null

  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="font-serif text-lg">{event.title}</CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatWhen(start, end)}
          </span>
          {event.location && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {event.location}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      {(event.description || event.join_url) && (
        <CardContent className="space-y-3">
          {event.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          )}
          {event.join_url && (
            <Button asChild size="sm" variant="outline">
              <a href={event.join_url} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Join / RSVP
              </a>
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function PostCard({
  post,
}: {
  post: {
    id: string
    kind: string
    title: string
    excerpt: string | null
    cover_url: string | null
    media_url: string | null
    published_at: string | null
  }
}) {
  const isPodcast = post.kind === 'podcast'
  return (
    <Card className="overflow-hidden">
      {post.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.cover_url}
          alt=""
          className="h-40 w-full object-cover"
        />
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-primary/10 to-primary/5" />
      )}
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            {isPodcast ? <Mic className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
            {isPodcast ? 'Podcast' : 'Post'}
          </Badge>
          {post.published_at && (
            <span className="text-xs text-muted-foreground">
              {new Date(post.published_at).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          )}
        </div>
        <CardTitle className="font-serif text-lg">{post.title}</CardTitle>
        {post.excerpt && (
          <CardDescription className="line-clamp-3">{post.excerpt}</CardDescription>
        )}
      </CardHeader>
      {isPodcast && post.media_url && (
        <CardContent>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio controls preload="none" className="w-full" src={post.media_url} />
        </CardContent>
      )}
    </Card>
  )
}

function ResourceRow({
  resource,
}: {
  resource: {
    id: string
    title: string
    description: string | null
    url: string
    category: string | null
  }
}) {
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-start justify-between gap-3 rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {resource.category && (
            <Badge variant="outline" className="text-[10px] uppercase">
              {resource.category}
            </Badge>
          )}
          <span className="truncate text-sm font-medium text-foreground group-hover:text-primary">
            {resource.title}
          </span>
        </div>
        {resource.description && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {resource.description}
          </p>
        )}
      </div>
      <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </a>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
      {copy}
    </p>
  )
}

/** "Nov 14, 2:00 PM" or "Nov 14, 2:00 - 3:30 PM". */
function formatWhen(start: Date, end: Date | null): string {
  const dateFmt: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  }
  const timeFmt: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
  }
  const datePart = start.toLocaleDateString(undefined, dateFmt)
  const startTime = start.toLocaleTimeString(undefined, timeFmt)
  if (!end) return `${datePart}, ${startTime}`
  const sameDay =
    start.toDateString() === end.toDateString()
  const endTime = end.toLocaleTimeString(undefined, timeFmt)
  return sameDay
    ? `${datePart}, ${startTime} – ${endTime}`
    : `${datePart}, ${startTime} – ${end.toLocaleDateString(undefined, dateFmt)}, ${endTime}`
}
