import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import { requireUser } from '@/lib/auth-server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { initialsFor } from '@/lib/types/profile'
import { loadCommunityDashboard } from '@/lib/community/load-dashboard'
import { ASK_CATEGORY_BY_VALUE } from '@/lib/community/ask-categories'

export const dynamic = 'force-dynamic'

/**
 * Community dashboard - the "what's happening" page for fellows.
 *
 * Surfaces:
 *   - Counts across the four feeds + member directory
 *   - Featured (admin-pinned) win for the week
 *   - The five most recent items per feed
 *   - Open asks needing replies, so help finds the people who can give it
 *   - The current member of the week (if any)
 *
 * The page is intentionally read-only: composers live on the
 * individual section pages so the dashboard stays a pure overview.
 */
export default async function CommunityDashboardPage() {
  await requireUser()
  const data = await loadCommunityDashboard()

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Community
          </p>
          <h1 className="mt-1 font-serif text-3xl text-balance text-foreground">
            What&apos;s happening this week
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            A quick read-out of who&apos;s sharing, asking, and learning together.
            Jump into a feed to write or comment.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/community">All sections</Link>
        </Button>
      </header>

      {/* Stat cards */}
      <section
        aria-label="Community at a glance"
        className="grid grid-cols-2 gap-3 md:grid-cols-5"
      >
        <StatTile
          href="/community/bios"
          icon={Users}
          label="Members"
          value={data.counts.members}
        />
        <StatTile
          href="/community/wins"
          icon={Trophy}
          label="Wins"
          value={data.counts.wins}
        />
        <StatTile
          href="/community/ask"
          icon={HelpCircle}
          label="Open asks"
          value={data.counts.openAsks}
          accent
        />
        <StatTile
          href="/community/reflections"
          icon={BookOpen}
          label="Reflections"
          value={data.counts.reflections}
        />
        <StatTile
          href="/community/stories"
          icon={MessageSquare}
          label="Stories"
          value={data.counts.stories}
        />
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {/* Featured win + recent wins */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-serif">
                <Trophy className="h-4 w-4 text-amber-600" aria-hidden="true" />
                Wins
              </CardTitle>
              <CardDescription>
                Celebrations from the field, plus the post staff pinned this week.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/community/wins" className="gap-1">
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {data.featuredWin ? (
              <Link
                href={`/community/stories/${data.featuredWin.id}`}
                className="group rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 transition-colors hover:bg-amber-500/10"
              >
                <div className="flex items-center gap-2">
                  <Badge className="gap-1 bg-amber-500 text-amber-950 hover:bg-amber-500">
                    <Sparkles className="h-3 w-3" />
                    Featured
                  </Badge>
                  {data.featuredWin.framework_name && (
                    <Badge variant="outline">
                      {data.featuredWin.framework_name}
                    </Badge>
                  )}
                </div>
                <h3 className="mt-2 font-serif text-lg leading-snug text-foreground group-hover:text-primary">
                  {data.featuredWin.title}
                </h3>
                {data.featuredWin.excerpt && (
                  <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {data.featuredWin.excerpt}
                  </p>
                )}
                <AuthorLine
                  name={data.featuredWin.author_name}
                  image={data.featuredWin.author_image}
                />
              </Link>
            ) : (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No featured win yet this week. Staff can pin one from any wins
                post.
              </p>
            )}

            {data.recentWins.length > 0 ? (
              <ul className="flex flex-col divide-y divide-border">
                {data.recentWins.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/community/stories/${post.id}`}
                      className="block py-3 transition-colors hover:bg-muted/50"
                    >
                      <p className="font-medium text-foreground">
                        {post.title}
                      </p>
                      <AuthorLine
                        name={post.author_name}
                        image={post.author_image}
                        timestamp={post.published_at}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </CardContent>
        </Card>

        {/* Member of the week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif">
              <Users className="h-4 w-4 text-primary" aria-hidden="true" />
              Member of the week
            </CardTitle>
            <CardDescription>
              Someone whose practice we&apos;re learning from right now.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.memberOfWeek ? (
              <Link
                href={`/community/bios#${data.memberOfWeek.id}`}
                className="group flex items-start gap-3"
              >
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={data.memberOfWeek.profile_image_url ?? undefined}
                    alt=""
                  />
                  <AvatarFallback>
                    {initialsFor(data.memberOfWeek.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="font-serif text-lg leading-tight text-foreground group-hover:text-primary">
                    {data.memberOfWeek.full_name ?? 'Member'}
                  </p>
                  {data.memberOfWeek.headline && (
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {data.memberOfWeek.headline}
                    </p>
                  )}
                  {data.memberOfWeek.community_role_label && (
                    <Badge variant="outline" className="mt-2 capitalize">
                      {data.memberOfWeek.community_role_label}
                    </Badge>
                  )}
                </div>
              </Link>
            ) : (
              <p className="rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground">
                No member of the week scheduled. Admins can pick one from{' '}
                <Link
                  href="/admin/community"
                  className="underline hover:text-foreground"
                >
                  Admin → Community
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Open asks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-serif">
                <HelpCircle
                  className="h-4 w-4 text-primary"
                  aria-hidden="true"
                />
                Open asks
              </CardTitle>
              <CardDescription>
                Questions waiting on a reply. If you know the answer, say so.
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/community/ask" className="gap-1">
                See all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.openAsks.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No open asks at the moment.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.openAsks.map((post) => (
                  <li key={post.id}>
                    <Link
                      href={`/community/stories/${post.id}`}
                      className="block py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-2">
                        <p className="flex-1 font-medium text-foreground">
                          {post.title}
                        </p>
                        {post.ask_category && (
                          <Badge variant="outline" className="shrink-0">
                            {ASK_CATEGORY_BY_VALUE.get(post.ask_category)
                              ?.label ?? post.ask_category}
                          </Badge>
                        )}
                      </div>
                      <AuthorLine
                        name={post.author_name}
                        image={post.author_image}
                        timestamp={post.published_at}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent reflections */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 font-serif">
                <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                Latest reflections
              </CardTitle>
              <CardDescription>From phase labs and content.</CardDescription>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link href="/community/reflections" className="gap-1">
                <ArrowRight className="h-4 w-4" />
                <span className="sr-only">See all reflections</span>
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentReflections.length === 0 ? (
              <p className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                No reflections yet.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.recentReflections.map((r) => (
                  <li
                    key={r.id}
                    className="rounded-md border border-border bg-card p-3"
                  >
                    {r.lab_title && (
                      <p className="text-xs font-medium uppercase tracking-wide text-primary">
                        {r.lab_title}
                      </p>
                    )}
                    <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-foreground">
                      {r.body}
                    </p>
                    <AuthorLine
                      name={r.author_name}
                      image={r.author_image}
                      timestamp={r.created_at}
                    />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/**
 * Compact stat tile linking to the matching feed. Accent variant
 * used for "open asks" because that's the count fellows should
 * actually act on.
 */
function StatTile({
  href,
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  href: string
  icon: typeof Users
  label: string
  value: number
  accent?: boolean
}) {
  return (
    <Link
      href={href}
      className={[
        'group rounded-lg border p-4 transition-colors',
        accent
          ? 'border-primary/40 bg-primary/5 hover:bg-primary/10'
          : 'border-border bg-card hover:border-primary/30',
      ].join(' ')}
    >
      <div className="flex items-center justify-between">
        <Icon
          className={[
            'h-4 w-4',
            accent ? 'text-primary' : 'text-muted-foreground',
          ].join(' ')}
          aria-hidden="true"
        />
        <span className="font-serif text-2xl text-foreground">{value}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{label}</p>
    </Link>
  )
}

/**
 * Author + timestamp byline shared by the post lists.
 */
function AuthorLine({
  name,
  image,
  timestamp,
}: {
  name: string | null
  image: string | null
  timestamp?: string | null
}) {
  return (
    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
      <Avatar className="h-5 w-5">
        <AvatarImage src={image ?? undefined} alt="" />
        <AvatarFallback className="text-[10px]">
          {initialsFor(name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{name ?? 'Member'}</span>
      {timestamp && (
        <>
          <span aria-hidden="true">·</span>
          <span>{formatRelative(timestamp)}</span>
        </>
      )}
    </div>
  )
}

function formatRelative(iso: string) {
  const ts = Date.parse(iso)
  if (Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  const min = Math.round(diff / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h ago`
  const d = Math.round(hr / 24)
  if (d < 7) return `${d}d ago`
  return new Date(ts).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })
}
