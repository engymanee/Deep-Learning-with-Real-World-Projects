import { notFound } from 'next/navigation'
import { LessonFooter } from '@/components/curriculum/lesson-footer'
import { LinkOpenButton } from '@/components/curriculum/link-open-button'
import { ReflectionForm } from '@/components/curriculum/reflection-form'
import { createClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth-server'
import {
  canFellowSeeContent,
  canFellowSeeModule,
  canFellowSeePhase,
  getResourceType,
  type ContentCategory,
  type ResourceType,
} from '@/lib/curriculum'
import {
  findAdjacentItems,
  loadFullCurriculum,
} from '@/lib/curriculum-tree'
import { reflectionMeetsMinimum } from '@/lib/reflections'

export const dynamic = 'force-dynamic'

interface PhaseRow {
  id: string
  cohorts: string[] | null
}

interface ModuleRow {
  id: string
  cohorts: string[] | null
}

interface ContentRow {
  id: string
  module_id: string
  title: string
  description: string | null
  body: string | null
  url: string | null
  category: ContentCategory | null
  resource_type: ResourceType | null
  cohorts: string[] | null
  duration_minutes: number | null
  reflection_enabled: boolean
  reflection_prompt: string | null
}

function formatDuration(mins: number | null): string | null {
  if (!mins || mins <= 0) return null
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`
}

/**
 * Pure right-pane content for a single curriculum item. The
 * surrounding chrome (top bar + curriculum tree on the left) lives
 * in app/(curriculum)/layout.tsx; this page just renders the
 * article. That mirrors the design brief: clicking a row in the tree
 * repaints only the right side.
 */
export default async function ContentItemPage({
  params,
}: {
  params: Promise<{ phaseId: string; moduleId: string; itemId: string }>
}) {
  const { phaseId, moduleId, itemId } = await params
  const user = await requireUser()
  const supabase = await createClient()

  const [{ data: phase }, { data: module }, { data: item }] = await Promise.all([
    supabase
      .from('years')
      .select('id, cohorts')
      .eq('id', phaseId)
      .maybeSingle<PhaseRow>(),
    supabase
      .from('modules')
      .select('id, cohorts')
      .eq('id', moduleId)
      .eq('phase_id', phaseId)
      .maybeSingle<ModuleRow>(),
    supabase
      .from('labs')
      .select(
        'id, module_id, title, description, body, url, category, resource_type, cohorts, duration_minutes, reflection_enabled, reflection_prompt',
      )
      .eq('id', itemId)
      .eq('module_id', moduleId)
      .maybeSingle<ContentRow>(),
  ])

  if (!phase || !module || !item) notFound()

  if (user.role === 'fellow') {
    const userCohort = user.cohort ?? null
    if (!canFellowSeePhase(phase.cohorts, userCohort)) notFound()
    if (!canFellowSeeModule(module.cohorts, phase.cohorts, userCohort)) {
      notFound()
    }
    if (
      !canFellowSeeContent(
        item.cohorts,
        phase.cohorts,
        userCohort,
        module.cohorts,
      )
    ) {
      notFound()
    }
  }

  // Look up per-user state for the gates and the completion radio.
  // All three are scoped to the current user via RLS, so we just
  // ask for the rows that exist.
  const [
    { data: completion },
    { data: linkClick },
    { data: reflection },
    curriculum,
  ] = await Promise.all([
    supabase
      .from('user_content_completions')
      .select('content_id')
      .eq('profile_id', user.id)
      .eq('content_id', item.id)
      .maybeSingle<{ content_id: string }>(),
    supabase
      .from('user_content_link_clicks')
      .select('content_id')
      .eq('profile_id', user.id)
      .eq('content_id', item.id)
      .maybeSingle<{ content_id: string }>(),
    supabase
      .from('user_content_reflections')
      .select('response')
      .eq('profile_id', user.id)
      .eq('content_id', item.id)
      .maybeSingle<{ response: string }>(),
    // Used only to compute the "Continue" target. Wrapped in
    // React.cache so the layout's call doesn't double-fetch.
    loadFullCurriculum(),
  ])

  const isCompleted = !!completion
  const linkClicked = !!linkClick
  const reflectionResponse = reflection?.response ?? null
  const resource = item.resource_type ? getResourceType(item.resource_type) : null
  const duration = formatDuration(item.duration_minutes)
  const hasBody = !!item.body && item.body.trim().length > 0
  const hasUrl = !!item.url
  const isLiveSession = item.resource_type === 'live_session'
  // Reflection is required as soon as the admin toggles it on. The
  // prompt is enforced separately at admin save time, so it'll
  // always be present here in practice - but we don't bypass the
  // gate just because the prompt happens to be missing.
  const reflectionRequired = item.reflection_enabled === true

  const { next } = findAdjacentItems(curriculum, item.id)

  // Gate states. Only block the FIRST completion - once an item is
  // already complete the fellow can freely uncheck/redo. Reflection
  // gate uses the shared 50-word rule so client-side disabled state
  // matches server-side validation. Live sessions are exempt from
  // the click-the-link gate (calendar invites, email RSVPs etc.
  // make the in-app click unnecessary friction).
  const needsLinkClick =
    !isCompleted && hasUrl && !linkClicked && !isLiveSession
  const needsReflection =
    !isCompleted &&
    reflectionRequired &&
    !reflectionMeetsMinimum(reflectionResponse)

  return (
    <article className="mx-auto max-w-2xl space-y-8">
      <header className="space-y-3">
        {(resource || duration) && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {resource && (
              <span className="rounded-full border border-border bg-muted px-2.5 py-0.5 font-medium uppercase tracking-wider">
                {resource.label}
              </span>
            )}
            {duration && <span>{duration}</span>}
          </div>
        )}
        <h1 className="text-pretty font-serif text-3xl leading-tight text-foreground md:text-4xl">
          {item.title}
        </h1>
        {item.description && (
          <p className="text-pretty text-base leading-relaxed text-muted-foreground">
            {item.description}
          </p>
        )}
      </header>

      {/* Body */}
      {hasBody && (
        <div className="space-y-4 text-base leading-relaxed text-foreground">
          {item.body!.split(/\n{2,}/).map((para, i) => (
            <p key={i} className="whitespace-pre-wrap">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* External resource CTA. The page header above already carries
          the title + description, so this card is just the action -
          no redundant "Open this resource" copy and no raw URL on
          display. The button label adapts to the resource type so
          the click affordance is self-describing. */}
      {hasUrl && (
        <div className="flex">
          <LinkOpenButton
            contentId={item.id}
            url={item.url!}
            isLiveSession={isLiveSession}
            label={
              isLiveSession
                ? 'Join live session'
                : resource
                  ? `Open ${resource.label.toLowerCase()}`
                  : 'Open resource'
            }
            alreadyClicked={linkClicked}
          />
        </div>
      )}

      {!hasBody && !hasUrl && !reflectionRequired && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            This item has no content attached yet.
          </p>
        </div>
      )}

      {/* Reflection prompt + response. Required to complete the
          item when enabled. */}
      {reflectionRequired && (
        <ReflectionForm
          contentId={item.id}
          prompt={item.reflection_prompt!.trim()}
          initialResponse={reflectionResponse}
        />
      )}

      {/* Footer pairs Mark-as-complete with Continue. The
          incomplete-CTA hint is used to reassure live-session
          fellows that they can mark complete without opening the
          in-app link. */}
      <LessonFooter
        contentId={item.id}
        isCompleted={isCompleted}
        needsLinkClick={needsLinkClick}
        needsReflection={needsReflection}
        nextHref={next?.href ?? null}
        incompleteHint={
          isLiveSession && !needsReflection
            ? 'Mark this complete once you have attended the live session.'
            : null
        }
      />
    </article>
  )
}
