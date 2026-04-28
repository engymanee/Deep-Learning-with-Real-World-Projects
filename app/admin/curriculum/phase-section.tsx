import { Plus, Pencil, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { CohortBadge } from '@/components/admin/cohort-access-field'
import {
  CATEGORY_DISPLAY_ORDER,
  CONTENT_CATEGORY_LABELS,
  CONTENT_CATEGORY_DESCRIPTIONS,
  CONTENT_RESOURCE_TYPE_LABELS,
  type ContentCategory,
  type ContentResourceType,
} from '@/lib/content-types'
import { ContentItemDialog } from './content-item-dialog'
import { ContentItemDelete } from './content-item-delete'
import { PhaseActions } from './phase-actions'

export interface AdminContentItem {
  id: string
  year_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory
  resource_type: ContentResourceType
  /** null = inherit phase, [] = locked, [A,B,C] = override. */
  cohorts: string[] | null
}

export interface AdminPhase {
  id: string
  title: string
  description: string | null
  cohorts: string[]
  items: AdminContentItem[]
}

/**
 * Single phase block in the admin curriculum page. Server-rendered;
 * delegates only the interactive bits (edit/delete dialogs) to client
 * sub-components.
 */
export function PhaseSection({ phase }: { phase: AdminPhase }) {
  // Bucket items into their declared category once so each section
  // below is a simple lookup. Categories that aren't part of the
  // canonical order are dropped silently rather than crashing the page.
  const itemsByCategory = new Map<ContentCategory, AdminContentItem[]>()
  for (const cat of CATEGORY_DISPLAY_ORDER) {
    itemsByCategory.set(cat, [])
  }
  for (const item of phase.items) {
    const list = itemsByCategory.get(item.category)
    if (list) list.push(item)
  }

  return (
    <section className="rounded-lg border border-border bg-background">
      <header className="flex flex-col gap-3 border-b border-border bg-muted/30 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-serif text-lg text-foreground">{phase.title}</h3>
            <CohortBadge cohorts={phase.cohorts} />
            <span className="text-xs text-muted-foreground">
              {phase.items.length} item{phase.items.length === 1 ? '' : 's'}
            </span>
          </div>
          {phase.description && (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {phase.description}
            </p>
          )}
        </div>
        <PhaseActions
          id={phase.id}
          title={phase.title}
          description={phase.description}
          cohorts={phase.cohorts}
          itemCount={phase.items.length}
        />
      </header>

      <div className="flex flex-col">
        {CATEGORY_DISPLAY_ORDER.map((cat) => (
          <CategoryGroup
            key={cat}
            category={cat}
            phaseId={phase.id}
            phaseTitle={phase.title}
            items={itemsByCategory.get(cat) ?? []}
          />
        ))}
      </div>
    </section>
  )
}

function CategoryGroup({
  category,
  phaseId,
  phaseTitle,
  items,
}: {
  category: ContentCategory
  phaseId: string
  phaseTitle: string
  items: AdminContentItem[]
}) {
  return (
    <div className="border-t border-border first:border-t-0">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-0.5">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {CONTENT_CATEGORY_LABELS[category]}
          </h4>
          <p className="max-w-xl text-xs text-muted-foreground">
            {CONTENT_CATEGORY_DESCRIPTIONS[category]}
          </p>
        </div>
        <ContentItemDialog
          mode="create"
          yearId={phaseId}
          phaseTitle={phaseTitle}
          defaultCategory={category}
          trigger={
            <Button size="sm" variant="outline">
              <Plus className="h-3.5 w-3.5" />
              Add content
            </Button>
          }
        />
      </div>

      {items.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {items.map((item) => (
            <ContentItemRow key={item.id} item={item} phaseTitle={phaseTitle} />
          ))}
        </ul>
      ) : (
        <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
          No items in this category yet.
        </p>
      )}
    </div>
  )
}

function ContentItemRow({
  item,
  phaseTitle,
}: {
  item: AdminContentItem
  phaseTitle: string
}) {
  const inherits = item.cohorts === null
  const locked = !inherits && (item.cohorts?.length ?? 0) === 0

  return (
    <li className="flex flex-col gap-2 px-5 py-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {CONTENT_RESOURCE_TYPE_LABELS[item.resource_type]}
          </span>
          <p className="truncate text-sm font-medium text-foreground">
            {item.title}
          </p>
          {inherits ? (
            <span
              className="rounded-full border border-dashed border-border bg-muted/40 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
              title="Inherits cohort access from the phase"
            >
              Inherits phase
            </span>
          ) : locked ? (
            <span
              className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-destructive"
              title="Override: locked from every fellow"
            >
              Locked
            </span>
          ) : (
            <CohortBadge cohorts={item.cohorts ?? []} />
          )}
        </div>
        {item.description && (
          <p className="text-xs text-muted-foreground">{item.description}</p>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-1 text-xs text-accent hover:underline"
          >
            {item.url}
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <ContentItemDialog
          mode="edit"
          yearId={item.year_id}
          phaseTitle={phaseTitle}
          initial={{
            id: item.id,
            title: item.title,
            description: item.description,
            body: item.body,
            url: item.url,
            category: item.category,
            resource_type: item.resource_type,
            cohorts: item.cohorts,
          }}
          trigger={
            <Button variant="ghost" size="sm" aria-label={`Edit ${item.title}`}>
              <Pencil className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Edit</span>
            </Button>
          }
        />
        <ContentItemDelete
          id={item.id}
          yearId={item.year_id}
          title={item.title}
        />
      </div>
    </li>
  )
}
