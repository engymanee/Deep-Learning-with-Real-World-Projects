'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  ExternalLink,
  FileText,
  Layers,
  LayoutGrid,
  Link2,
  List,
  PlayCircle,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { AddResourceDialog } from '@/components/library/add-resource-dialog'

/**
 * Shape returned by the server page after cohort gating. Kept loose
 * so the dashboard can hand us either the raw row or a projection -
 * we only read the fields we render.
 */
export interface LibraryResource {
  id: string
  title: string
  description: string | null
  url: string
  resourceType: 'document' | 'video' | 'link' | 'reading'
  tags: string[]
  /** ISO timestamp; null when the underlying row is missing one. */
  createdAt: string | null
}

export interface LibraryViewProps {
  resources: LibraryResource[]
  /** Whether to render the admin-only "Add resource" affordance. */
  canManage: boolean
}

type FilterId = 'all' | 'document' | 'video' | 'link' | 'recent'

/** Keep label + icon decisions in one place so cards and filters
 *  stay consistent without prop-drilling. */
const TYPE_META: Record<
  LibraryResource['resourceType'],
  { label: string; Icon: typeof FileText; cta: string }
> = {
  document: { label: 'Document', Icon: FileText, cta: 'Download' },
  video:    { label: 'Video',    Icon: PlayCircle, cta: 'Watch' },
  reading:  { label: 'Reading',  Icon: BookOpen,  cta: 'Read' },
  link:     { label: 'Link',     Icon: Link2,     cta: 'Open' },
}

/** Filter-bar definitions. Order is meaningful: All sits first,
 *  Recent sits last as a sort-style toggle. */
const FILTERS: Array<{ id: FilterId; label: string }> = [
  { id: 'all',      label: 'All' },
  { id: 'document', label: 'Documents' },
  { id: 'video',    label: 'Videos' },
  { id: 'link',     label: 'Links' },
  { id: 'recent',   label: 'Recent' },
]

const RECENT_DAYS = 30

export function LibraryView({ resources, canManage }: LibraryViewProps) {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [filter, setFilter] = useState<FilterId>('all')
  const [query, setQuery] = useState('')

  // Derived list. Three transformations stack: filter -> search ->
  // sort. Memoised on inputs only so the table doesn't re-render
  // when an unrelated piece of state (e.g. the dialog) toggles.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const cutoff = Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000

    let list = resources

    if (filter === 'recent') {
      list = list.filter((r) => {
        if (!r.createdAt) return false
        return new Date(r.createdAt).getTime() >= cutoff
      })
    } else if (filter !== 'all') {
      // Map the singular type pill ("document") to the resource's
      // resource_type. "Reading" content lives under the All pill -
      // surfacing it as a separate filter would clutter the bar.
      list = list.filter((r) => r.resourceType === filter)
    }

    if (q) {
      list = list.filter((r) => {
        const hay = (
          r.title +
          ' ' +
          (r.description ?? '') +
          ' ' +
          r.tags.join(' ')
        ).toLowerCase()
        return hay.includes(q)
      })
    }

    // Always show newest first - "Recent" sharpens the rule but the
    // baseline ordering is the same so card placement is stable.
    return [...list].sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return bt - at
    })
  }, [resources, filter, query])

  return (
    <div className="flex flex-col gap-6">
      {/* Header: title, subtitle, admin Add button */}
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-2xl text-foreground">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Curated tools, readings, and recordings. Use the search and filters
            to find what you need.
          </p>
        </div>
        {canManage && <AddResourceDialog />}
      </header>

      {/* Search */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title, description, or tag..."
          aria-label="Search the library"
          className="pl-9"
        />
      </div>

      {/* Filter pills + view toggle on one row, wrapping below sm. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Filter resources"
          className="flex flex-wrap items-center gap-2"
        >
          {FILTERS.map((f) => {
            const active = filter === f.id
            return (
              <button
                key={f.id}
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {f.label}
              </button>
            )
          })}
        </div>

        <div
          role="group"
          aria-label="View mode"
          className="inline-flex items-center rounded-md border border-border bg-card p-0.5"
        >
          <ViewToggleButton
            active={view === 'grid'}
            onClick={() => setView('grid')}
            label="Grid view"
            Icon={LayoutGrid}
          />
          <ViewToggleButton
            active={view === 'list'}
            onClick={() => setView('list')}
            label="List view"
            Icon={List}
          />
        </div>
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <EmptyState
          query={query}
          filter={filter}
          totalResources={resources.length}
        />
      ) : view === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <GridCard key={r.id} resource={r} />
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {filtered.map((r) => (
            <ListRow key={r.id} resource={r} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ViewToggleButton({
  active,
  onClick,
  label,
  Icon,
}: {
  active: boolean
  onClick: () => void
  label: string
  Icon: typeof LayoutGrid
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center rounded transition-colors',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-muted',
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  )
}

/** Compact card surfaced in grid view - the primary library
 *  affordance. Hover lifts the border + adds a subtle shadow so
 *  card boundaries stay readable on the muted background. */
function GridCard({ resource }: { resource: LibraryResource }) {
  const meta = TYPE_META[resource.resourceType]
  const Icon = meta.Icon

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
          {meta.label}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <h3 className="line-clamp-2 font-serif text-base leading-snug text-foreground group-hover:text-primary">
          {resource.title}
        </h3>
        {resource.description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {resource.description}
          </p>
        )}
      </div>

      {resource.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {resource.tags.slice(0, 4).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px]">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <DateLabel iso={resource.createdAt} />
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          {meta.cta}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      </div>
    </a>
  )
}

/** Dense one-per-row layout used by the List view. Keeps the same
 *  affordances the card has, just rearranged horizontally so users
 *  can scan more items per screen. */
function ListRow({ resource }: { resource: LibraryResource }) {
  const meta = TYPE_META[resource.resourceType]
  const Icon = meta.Icon

  return (
    <li>
      <a
        href={resource.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
      >
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h3 className="font-serif text-base leading-snug text-foreground group-hover:text-primary">
              {resource.title}
            </h3>
            <Badge variant="outline" className="text-[10px] uppercase tracking-wide">
              {meta.label}
            </Badge>
          </div>
          {resource.description && (
            <p className="mt-1 line-clamp-1 text-sm leading-relaxed text-muted-foreground">
              {resource.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <DateLabel iso={resource.createdAt} />
            {resource.tags.slice(0, 4).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="hidden shrink-0 sm:inline-flex"
          tabIndex={-1}
        >
          {meta.cta}
          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
        </Button>
      </a>
    </li>
  )
}

function DateLabel({ iso }: { iso: string | null }) {
  if (!iso) return <span aria-hidden="true">&nbsp;</span>
  // Server can ship an ISO string; rendering it via Intl keeps the
  // output stable between SSR + CSR (no time zone drift in copy).
  const date = new Date(iso)
  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return <time dateTime={iso}>Added {formatted}</time>
}

function EmptyState({
  query,
  filter,
  totalResources,
}: {
  query: string
  filter: FilterId
  totalResources: number
}) {
  // Three subtly-different empty messages keep the page from
  // misleading users: nothing curated yet vs. nothing matches the
  // current narrowing. Worded so the action to recover is obvious.
  const isLibraryEmpty = totalResources === 0
  const message = isLibraryEmpty
    ? "There are no resources in the library yet. Once a facilitator publishes one, it'll show up here."
    : query
      ? 'No resources match your search. Try different keywords or clear the filter.'
      : filter !== 'all'
        ? 'No resources match this filter yet. Switch to "All" to see everything.'
        : 'No resources to show.'

  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      <span className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Layers className="h-5 w-5" aria-hidden="true" />
      </span>
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
