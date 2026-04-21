import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Empty, EmptyHeader, EmptyTitle, EmptyMedia } from '@/components/ui/empty'
import { Pin, Plus, Pencil, Trash2, Megaphone } from 'lucide-react'
import { AnnouncementDialog, type YearOption, type CohortOption } from './announcement-dialog'
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
  published_at: string
  year: { id: string; title: string } | null
  cohort: { id: string; name: string } | null
  author: { full_name: string | null } | null
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

  const [{ data: announcementRows }, { data: years }, { data: cohorts }] =
    await Promise.all([
      supabase
        .from('announcements')
        .select(
          'id, title, body, pinned, audience_scope, year_id, cohort_id, published_at, year:years(id, title), cohort:cohorts(id, name), author:profiles!author_id(full_name)',
        )
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false }),
      supabase.from('years').select('id, title').order('order_index'),
      supabase.from('cohorts').select('id, name').order('name'),
    ])

  const rows: AnnouncementRow[] = (announcementRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    audience_scope: r.audience_scope,
    year_id: r.year_id,
    cohort_id: r.cohort_id,
    published_at: r.published_at,
    year: Array.isArray(r.year) ? r.year[0] ?? null : r.year ?? null,
    cohort: Array.isArray(r.cohort) ? r.cohort[0] ?? null : r.cohort ?? null,
    author: Array.isArray(r.author) ? r.author[0] ?? null : r.author ?? null,
  }))

  const yearOptions: YearOption[] = years ?? []
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
                    initial={{
                      id: row.id,
                      audience_scope: row.audience_scope,
                      year_id: row.year_id,
                      cohort_id: row.cohort_id,
                      title: row.title,
                      body: row.body,
                      pinned: row.pinned,
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
