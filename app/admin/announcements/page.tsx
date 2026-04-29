import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyMedia,
} from '@/components/ui/empty'
import {
  Pin,
  Pencil,
  Trash2,
  Megaphone,
  BookOpen,
  Users,
} from 'lucide-react'
import {
  AnnouncementDialog,
  type SchoolTeamOption,
  type FellowOption,
  type ContentOption,
  type AudienceScope,
} from './announcement-dialog'
import { NewAnnouncementButton } from './new-announcement-button'
import {
  deleteAnnouncement,
  togglePinAnnouncement,
} from './actions'

export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AnnouncementRow {
  id: string
  title: string
  body: string
  pinned: boolean
  audience_scope: AudienceScope | 'year'
  cohort_codes: string[] | null
  school_team_ids: string[] | null
  user_ids: string[] | null
  content_id: string | null
  published_at: string
  author: { full_name: string | null } | null
  content: {
    id: string
    title: string
    year_id: string
    module_id: string
  } | null
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function contentHref(c: { year_id: string; module_id: string; id: string }) {
  return `/phases/${c.year_id}/modules/${c.module_id}/items/${c.id}`
}

/**
 * Pretty audience summary for the list row. Falls back to a generic
 * label for legacy "year" rows we no longer let curators create.
 */
function audienceLabel(
  row: AnnouncementRow,
  schoolNameById: Map<string, string>,
  fellowNameById: Map<string, string>,
): string {
  switch (row.audience_scope) {
    case 'global':
      return 'Everyone'
    case 'cohort': {
      const codes = row.cohort_codes ?? []
      if (codes.length === 0) return 'Cohort'
      return `Cohort ${codes.join(', ')}`
    }
    case 'school_team': {
      const ids = row.school_team_ids ?? []
      if (ids.length === 0) return 'School team'
      const names = ids
        .map((id) => schoolNameById.get(id))
        .filter((n): n is string => !!n)
      if (names.length <= 2) return names.join(', ') || 'School team'
      return `${names[0]}, ${names[1]} +${names.length - 2}`
    }
    case 'users': {
      const ids = row.user_ids ?? []
      if (ids.length === 0) return 'Specific fellow'
      const names = ids
        .map((id) => fellowNameById.get(id))
        .filter((n): n is string => !!n)
      if (names.length === 1) return names[0] ?? 'Specific fellow'
      return `${names[0] ?? 'Fellow'} +${names.length - 1}`
    }
    default:
      return 'Custom'
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function AdminAnnouncementsPage() {
  await requireAdmin()
  const supabase = await createClient()

  const [
    { data: announcementRows },
    { data: schoolTeamRows },
    { data: fellowRows },
    { data: yearRows },
    { data: labRows },
    { data: moduleRows },
  ] = await Promise.all([
    supabase
      .from('announcements')
      .select(
        'id, title, body, pinned, audience_scope, cohort_codes, school_team_ids, user_ids, content_id, published_at, author:profiles!author_id(full_name), content:labs!content_id(id, title, year_id, module_id)',
      )
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false }),
    supabase.from('cohorts').select('id, name').order('name'),
    supabase
      .from('profiles')
      .select('id, full_name, email, cohort, role')
      .order('full_name'),
    supabase.from('years').select('id, title, order_index').order('order_index'),
    supabase
      .from('labs')
      .select('id, title, year_id, module_id, order_index')
      .order('order_index', { ascending: true }),
    supabase
      .from('modules')
      .select('id, title, phase_id, order_index')
      .order('order_index', { ascending: true }),
  ])

  // School teams: cohorts table holds the school leadership groups.
  const schoolTeams: SchoolTeamOption[] = (schoolTeamRows ?? []).map((c) => ({
    id: c.id,
    name: c.name,
  }))
  const schoolNameById = new Map(schoolTeams.map((s) => [s.id, s.name]))

  // Fellows: keep only learner roles for the picker. Coaches/admins
  // shouldn't show up as targets for "Specific fellow".
  const fellows: FellowOption[] = (fellowRows ?? [])
    .filter((p) => p.role === 'fellow')
    .map((p) => ({
      id: p.id,
      fullName: p.full_name ?? p.email ?? 'Unnamed fellow',
      email: p.email ?? null,
      cohort: (p.cohort as string | null) ?? null,
    }))
  const fellowNameById = new Map(fellows.map((f) => [f.id, f.fullName]))

  const rows: AnnouncementRow[] = (announcementRows ?? []).map((r) => ({
    id: r.id,
    title: r.title,
    body: r.body,
    pinned: r.pinned,
    audience_scope: r.audience_scope,
    cohort_codes: (r.cohort_codes as string[] | null) ?? null,
    school_team_ids: (r.school_team_ids as string[] | null) ?? null,
    user_ids: (r.user_ids as string[] | null) ?? null,
    content_id: r.content_id,
    published_at: r.published_at,
    author: Array.isArray(r.author) ? r.author[0] ?? null : r.author ?? null,
    content: Array.isArray(r.content)
      ? r.content[0] ?? null
      : (r.content as AnnouncementRow['content']) ?? null,
  }))

  // Curriculum picker labels. We pre-flatten "Phase > Module > Item"
  // so the dialog can stay a plain Select.
  const yearById = new Map<string, { title: string; order_index: number }>()
  for (const y of yearRows ?? []) {
    yearById.set(y.id, {
      title: y.title,
      order_index: y.order_index ?? 0,
    })
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

  return (
    <div className="space-y-6">
      {/*
        Section header. We keep an explicit H2 + description on the left
        and the primary CTA on the right. Wrapping is allowed via
        `flex-wrap` so the button stays on screen on narrow viewports
        instead of being clipped, and `shrink-0` guarantees the button
        never collapses to zero width when the description is long.
      */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="font-serif text-2xl text-foreground">Announcements</h2>
          <p className="text-sm text-muted-foreground max-w-xl">
            Post messages to everyone, a specific cohort, a school team, or
            individual fellows.
          </p>
        </div>
        <NewAnnouncementButton
          schoolTeams={schoolTeams}
          fellows={fellows}
          contentOptions={contentOptions}
          variant="header"
        />
      </div>

      {rows.length === 0 ? (
        // Redundant CTA inside the empty state so curators have a
        // second, in-context way to start their first announcement -
        // important when the page-level button might be off-screen on
        // small displays or scrolled past.
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone className="h-6 w-6" />
            </EmptyMedia>
            <EmptyTitle>No announcements yet</EmptyTitle>
          </EmptyHeader>
          <div className="mt-4 flex justify-center">
            <NewAnnouncementButton
              schoolTeams={schoolTeams}
              fellows={fellows}
              contentOptions={contentOptions}
              variant="empty"
            />
          </div>
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
                    <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                      <Users className="h-3 w-3" aria-hidden />
                      {audienceLabel(row, schoolNameById, fellowNameById)}
                    </span>
                  </div>
                  <p className="text-sm text-text leading-relaxed whitespace-pre-wrap">
                    {row.body}
                  </p>
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
                    schoolTeams={schoolTeams}
                    fellows={fellows}
                    contentOptions={contentOptions}
                    initial={{
                      id: row.id,
                      // Legacy "year" rows fall back to "global" in the
                      // dialog so the curator never lands on a value the
                      // picker can't render.
                      audience_scope:
                        row.audience_scope === 'year'
                          ? 'global'
                          : (row.audience_scope as AudienceScope),
                      cohort_codes: row.cohort_codes ?? [],
                      school_team_ids: row.school_team_ids ?? [],
                      user_ids: row.user_ids ?? [],
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
