import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty'
import {
  Pin,
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  BookOpen,
} from 'lucide-react'
import {
  AnnouncementDialog,
  type YearOption,
  type CohortOption,
  type ContentOption,
} from './announcement-dialog'
import {
  deleteAnnouncement,
  togglePinAnnouncement,
} from './actions'

export const dynamic = 'force-dynamic'

interface AnnouncementRow {
  id: string
  title: string
  body: string
  pinned: boolean
  audience_scope: 'global' | 'year' | 'cohort'
  year_id: string | null
  cohort_id: string | null
  content_id: string | null
  published_at: string
  year: { id: string; title: string } | null
  cohort: { id: string; name: string } | null
  author: { full_name: string | null } | null
  /** Joined lab summary so the row can render a deep-link to the
   *  pinned curriculum item without a second round trip. */
  content: {
    id: string
    title: string
    year_id: string
    module_id: string
  } | null
}

/**
 * Build the public learner URL for a curriculum item. Mirrors the
 * route at app/(curriculum)/phases/[phaseId]/modules/[moduleId]/items/[itemId].
 */
function contentHref(c: { year_id: string; module_id: string; id: string }) {
  return `/phases/${c.year_id}/modules/${c.module_id}/items/${c.id}`
}

function audienceLabel(row: AnnouncementRow): string {
  if (row.audience_scope === 'global') return 'Everyone'
  if (row.audience_scope === 'year') return row.year?.title ?? 'Year'
  return row.cohort?.name ?? 'Cohort'
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const supabase = await createClient()

  // We fetch labs (curriculum items) alongside everything else so the
  // pin-to-content picker has data and so we can render a friendly
  // deep-link ("Reading: X") on rows that already have a pin.
  const [
    { data: announcementRows },
    { data: years },
    { data: cohorts },
    { data: labRows },
    { data: moduleRows },
  ] = await Promise.all([
    supabase
      .from('announcements')
      .select(
        'id, title, body, pinned, audience_scope, year_id, cohort_id, content_id, published_at, year:years(id, title), cohort:cohorts(id, name), author:profiles!author_id(full_name), content:labs!content_id(id, title, year_id, module_id)',
      )
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false }),
    supabase.from('years').select('id, title, order_index').order('order_index'),
    supabase.from('cohorts').select('id, name').order('name'),
    supabase
      .from('labs')
      .select('id, title, year_id, module_id, order_index')
      .order('order_index', { ascending: true }),
    supabase
      .from('modules')
      .select('id, title, phase_id, order_index')
      .order('order_index', { ascending: true }),
  ])

  const rows: AnnouncementRow[] = (announcementRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    audience_scope: r.audience_scope,
    year_id: r.year_id,
    cohort_id: r.cohort_id,
    content_id: r.content_id,
    published_at: r.published_at,
    year: Array.isArray(r.year) ? r.year[0] ?? null : r.year ?? null,
    cohort: Array.isArray(r.cohort) ? r.cohort[0] ?? null : r.cohort ?? null,
    author: Array.isArray(r.author) ? r.author[0] ?? null : r.author ?? null,
    content: Array.isArray(r.content)
      ? r.content[0] ?? null
      : (r.content as AnnouncementRow['content']) ?? null,
  }))

  // Build the curator-facing labels for the content picker. We
  // pre-flatten "Year > Module > Item" into a single string so the
  // dialog can stay a plain Select. Items missing a phase/module
  // still show with a graceful fallback rather than disappearing.
  const yearById = new Map<string, { title: string; order_index: number }>()
  for (const y of years ?? []) {
    yearById.set(y.id, { title: y.title, order_index: y.order_index ?? 0 })
  }
  const moduleById = new Map<
    string,
    { title: string; phase_id: string; order_index: number }
  >()
  for (const m of moduleRows ?? []) {
    moduleById.set(m.id, {
      title: m.title,
      phase_id: m.phase_id,
      order_index: m.order_index ?? 0,
    })
  }
  const contentOptions: ContentOption[] = (labRows ?? [])
    .map((lab) => {
      const mod = lab.module_id ? moduleById.get(lab.module_id) : null
      const yr = yearById.get(lab.year_id)
      const yearLabel = yr?.title ?? 'Phase'
      const modLabel = mod?.title ?? 'Module'
      return {
        id: lab.id,
        label: `${yearLabel} \u00b7 ${modLabel} \u2014 ${lab.title}`,
        phaseId: lab.year_id,
        phaseTitle: yearLabel,
        // Sort key: phase order, module order, lab order. Hidden,
        // not part of the public ContentOption shape.
        _sort: [
          yr?.order_index ?? 0,
          mod?.order_index ?? 0,
          lab.order_index ?? 0,
        ] as [number, number, number],
      }
    })
    .sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        if (a._sort[i] !== b._sort[i]) return a._sort[i] - b._sort[i]
      }
      return a.label.localeCompare(b.label)
    })
    .map(({ _sort: _drop, ...rest }) => rest)

  const yearOptions: YearOption[] = (years ?? []).map((y) => ({
    id: y.id,
    title: y.title,
  }))
  const cohortOptions: CohortOption[] = cohorts ?? []

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-3xl text-primary">Announcements</h1>
          <p className="text-sm text-text-muted mt-1">
            Post messages to every learner, a specific year, or a specific
            cohort.
          </p>
        </div>
        <AnnouncementDialog
          mode="create"
          years={yearOptions}
          cohorts={cohortOptions}
          contentOptions={contentOptions}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New announcement
            </Button>
          }
        />
      </div>

      {rows.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No announcements yet</EmptyTitle>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="border-border">
              <CardContent className="p-5 flex items-start gap-4 flex-wrap">
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-lg text-primary truncate">
                      {row.title}
                    </h2>
                    {row.pinned && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-bg-muted px-2 py-0.5 text-xs text-text-muted">
                        <Pin className="h-3 w-3" aria-hidden />
                        Pinned
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                      {audienceLabel(row)}
                    </span>
                  </div>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {row.body}
                  </p>
                  {/*
                    Surface the pinned curriculum item directly on the
                    admin row so curators can verify (and click into)
                    the linked content without opening the edit dialog.
                  */}
                  {row.content && (
                    <Link
                      href={contentHref(row.content)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                    >
                      <BookOpen className="h-3.5 w-3.5" aria-hidden />
                      Reminder for: {row.content.title}
                    </Link>
                  )}
                  <p className="text-xs text-text-muted">
                    {row.author?.full_name ?? 'Unknown author'} ·{' '}
                    {formatDate(row.published_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <form action={togglePinAnnouncement}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label={row.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin
                        className={`h-4 w-4 ${
                          row.pinned ? 'text-primary' : 'text-text-muted'
                        }`}
                      />
                    </Button>
                  </form>

                  <AnnouncementDialog
                    mode="edit"
                    years={yearOptions}
                    cohorts={cohortOptions}
                    contentOptions={contentOptions}
                    initial={{
                      id: row.id,
                      audience_scope: row.audience_scope,
                      year_id: row.year_id,
                      cohort_id: row.cohort_id,
                      title: row.title,
                      body: row.body,
                      pinned: row.pinned,
                      content_id: row.content_id,
                    }}
                    trigger={
                      <Button variant="ghost" size="sm" aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    }
                  />

                  <form action={deleteAnnouncement}>
                    <input type="hidden" name="id" value={row.id} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
