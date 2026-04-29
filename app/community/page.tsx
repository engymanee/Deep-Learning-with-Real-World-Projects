import Link from 'next/link'
import {
  CalendarDays,
  FileText,
  Mic,
  Shield,
  Users,
  Video,
} from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { TopBar } from '@/components/top-bar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  EventsList,
  type CommunityEvent,
} from '@/components/community/events-list'
import { BiosDirectory } from '@/components/community/bios-directory'
import type { DirectoryProfile } from '@/lib/types/profile'

export const metadata = {
  title: 'Community | Leadership Fellowship',
  description:
    'Upcoming events, stories from the field, and the directory of fellows.',
}

interface RawEvent {
  id: string
  title: string
  description: string | null
  starts_at: string
  ends_at: string | null
  location: string | null
  join_url: string | null
  event_type: string | null
  host: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface RawPost {
  id: string
  kind: string
  title: string
  excerpt: string | null
  cover_url: string | null
  media_url: string | null
  published_at: string | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

interface RawProfile {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  avatar_url: string | null
  role: string | null
  cohort: string | null
  bio: string | null
  schools: { name: string | null } | null
}

/**
 * /community - the social hub. Three tabs:
 *   1. Upcoming Events (filterable by event type, with "Add to calendar")
 *   2. Stories (feed of community posts, click for detail view)
 *   3. Fellow Bios (full directory: photo / cohort / team / bio + search)
 *
 * Server fetches all three slices in parallel; each tab embeds a client
 * island where it needs interactive filtering. The Stories tab is plain
 * server-rendered cards because clicks navigate to /community/stories/[id].
 */
export default async function CommunityPage() {
  const user = await requireUser()
  const supabase = await createClient()

  const nowIso = new Date().toISOString()

  const [eventsRes, postsRes, profilesRes] = await Promise.all([
    supabase
      .from('community_events')
      .select(
        `
        id, title, description, starts_at, ends_at, location, join_url, event_type,
        host:created_by (id, full_name, email, avatar_url)
      `,
      )
      .gte('starts_at', nowIso)
      .order('starts_at', { ascending: true })
      .limit(20)
      .returns<RawEvent[]>(),
    supabase
      .from('community_posts')
      .select(
        `
        id, kind, title, excerpt, cover_url, media_url, published_at,
        author:created_by (id, full_name, email, avatar_url)
      `,
      )
      .not('published_at', 'is', null)
      .order('published_at', { ascending: false })
      .limit(24)
      .returns<RawPost[]>(),
    supabase
      .from('profiles')
      .select(
        `
        id, full_name, email, title, avatar_url, role, cohort, bio,
        schools:school_id (name)
      `,
      )
      .in('role', ['fellow', 'facilitator'])
      .is('deactivated_at', null)
      .order('full_name', { ascending: true })
      .limit(500)
      .returns<RawProfile[]>(),
  ])

  const events: CommunityEvent[] = (eventsRes.data ?? []).map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    starts_at: e.starts_at,
    ends_at: e.ends_at,
    location: e.location,
    join_url: e.join_url,
    event_type: e.event_type,
    host: e.host,
  }))

  const posts = postsRes.data ?? []

  const profiles: DirectoryProfile[] = (profilesRes.data ?? []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    title: p.title,
    avatar_url: p.avatar_url,
    role: p.role,
    cohort: p.cohort,
    bio: p.bio,
    school_name: p.schools?.name ?? null,
  }))

  return (
    <div className="min-h-screen bg-background">
      <TopBar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:py-10">
        <header className="flex flex-col gap-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Community of Practice
          </p>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="max-w-3xl text-pretty font-serif text-3xl text-foreground md:text-4xl">
              Connect with the Fellowship
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
            Upcoming events, stories from the field, and the people you are
            learning alongside - all in one place.
          </p>
        </header>

        <Tabs defaultValue="events" className="flex flex-col gap-6">
          <TabsList className="self-start">
            <TabsTrigger value="events" className="gap-2">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Upcoming events
              <Badge variant="outline" className="ml-1 text-[10px]">
                {events.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="stories" className="gap-2">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              Stories
              <Badge variant="outline" className="ml-1 text-[10px]">
                {posts.length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="bios" className="gap-2">
              <Users className="h-3.5 w-3.5" aria-hidden="true" />
              Fellow Bios
              <Badge variant="outline" className="ml-1 text-[10px]">
                {profiles.length}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events" className="mt-0">
            {events.length === 0 ? (
              <EmptyState copy="No events scheduled yet. Check back soon." />
            ) : (
              <EventsList events={events} />
            )}
          </TabsContent>

          <TabsContent value="stories" className="mt-0">
            {posts.length === 0 ? (
              <EmptyState copy="No stories published yet. New posts will appear here." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {posts.map((p) => (
                  <StoryCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="bios" className="mt-0">
            {profiles.length === 0 ? (
              <EmptyState copy="No fellows or facilitators are listed yet." />
            ) : (
              <BiosDirectory
                profiles={profiles}
                showCohort={user.role === 'admin'}
              />
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

function StoryCard({ post }: { post: RawPost }) {
  const dateLabel = post.published_at
    ? new Date(post.published_at).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : ''

  const kindLabel =
    post.kind === 'podcast' ? 'Podcast' : post.kind === 'video' ? 'Video' : 'Story'
  const KindIcon = post.kind === 'podcast' ? Mic : post.kind === 'video' ? Video : FileText

  const authorName =
    post.author?.full_name?.trim() || post.author?.email || 'Anonymous'
  const authorInitials = (authorName.match(/\b\w/g) ?? ['?'])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <Link
      href={`/community/stories/${post.id}`}
      className="group flex flex-col overflow-hidden rounded-md border border-border bg-card transition-colors hover:border-primary/40 hover:bg-accent"
    >
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
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-[10px] uppercase">
            <KindIcon className="h-3 w-3" aria-hidden="true" />
            {kindLabel}
          </Badge>
          {dateLabel && (
            <span className="text-xs text-muted-foreground">{dateLabel}</span>
          )}
        </div>
        <h3 className="font-serif text-lg leading-tight text-foreground text-balance group-hover:text-primary">
          {post.title}
        </h3>
        {post.excerpt && (
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        )}

        <div className="mt-auto flex items-center gap-2 border-t border-border pt-3">
          <div
            aria-hidden="true"
            className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-[10px] font-medium text-muted-foreground"
          >
            {post.author?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.author.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              authorInitials
            )}
          </div>
          <span className="truncate text-xs text-muted-foreground">
            {authorName}
          </span>
          <span className="ml-auto text-xs font-medium text-primary group-hover:underline">
            Read story →
          </span>
        </div>
      </div>
    </Link>
  )
}

function EmptyState({ copy }: { copy: string }) {
  return (
    <p className="rounded-md border border-dashed border-border bg-card p-12 text-center text-sm text-muted-foreground">
      {copy}
    </p>
  )
}
