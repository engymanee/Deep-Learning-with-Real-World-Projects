import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { getSectionBySlug } from '@/lib/community/sections'
import type { CommunityPostListItem } from '@/components/community/post-feed'

interface RawPostRow {
  id: string
  kind: string
  title: string
  excerpt: string | null
  body: string | null
  cover_url: string | null
  published_at: string | null
  featured_at: string | null
  is_archived: boolean | null
  visibility: string | null
  visibility_scope_id: string | null
  framework_resource_id: string | null
  framework: {
    id: string
    title: string
    resource_url: string | null
  } | null
  ask_category: string | null
  ask_status: string | null
  star_rating: number | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/** Options for filtering / scoping the section feed. */
export interface LoadSectionOptions {
  /**
   * Free-text search term. Matched against title + excerpt + body
   * via Postgres ILIKE so it picks up hashtags ("#literacy") and
   * keywords without needing a separate tags table.
   */
  query?: string
  /**
   * Optional ask category filter. Only meaningful for the Ask
   * section. Ignored for sections that don't track categories.
   */
  askCategory?: string
  /**
   * Optional ask status filter (open / answered / closed). Only
   * meaningful for the Ask section.
   */
  askStatus?: string
  /**
   * When true, archived posts are included (admin moderation views).
   * Defaults to false so fellows never see archived posts.
   */
  includeArchived?: boolean
}

/**
 * Load published posts for a single Community section, identified by
 * its slug. Centralises the query + author embed + ordering so each
 * section page is a small wrapper around this call.
 *
 * Throws if the slug doesn't match a known section or the section
 * isn't a post feed (e.g. bios) - that would be a programming
 * error, not a runtime user error.
 */
export async function loadSectionPosts(
  slug: string,
  options: LoadSectionOptions = {},
): Promise<CommunityPostListItem[]> {
  const section = getSectionBySlug(slug)
  if (!section) throw new Error(`Unknown community section: ${slug}`)
  if (!section.postKinds) {
    throw new Error(`Section ${slug} is not a post feed`)
  }

  const supabase = await createClient()

  // Get current user for visibility filtering
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user's cohort for visibility filtering (if applicable)
  let userCohortId: string | null = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('cohort_id')
      .eq('id', user.id)
      .single()
    userCohortId = profile?.cohort_id ?? null
  }

  let q = supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, body, cover_url, published_at,
      featured_at, is_archived, visibility, visibility_scope_id,
      framework_resource_id, ask_category, ask_status, star_rating,
      framework:framework_resource_id ( id, title, resource_url ),
      author:created_by ( id, full_name, email, avatar_url )
      `,
    )
    .in('kind', section.postKinds)
    .not('published_at', 'is', null)

  // Hide archived rows from non-admin views by default. Admin pages
  // pass includeArchived=true explicitly so they can moderate.
  if (!options.includeArchived) {
    q = q.eq('is_archived', false)
  }

  // Visibility filtering: users can see:
  // - All posts with visibility='public'
  // - Posts with visibility='cohort' if in same cohort
  // - Posts with visibility='school_team' if in same school team (posts owned by user or same team)
  // For now, we'll use a simple approach: filter by visibility field
  q = q.or(
    `visibility.eq.public,and(visibility.eq.cohort,visibility_scope_id.eq.${userCohortId})`,
  )

  // Free-text search: match the term anywhere in title/excerpt/body.
  // Using `.or()` with three ILIKE filters keeps it index-free but
  // simple - if/when the corpus grows we can swap in a tsvector.
  const term = options.query?.trim()
  if (term) {
    const escaped = term.replace(/[%_]/g, (c) => `\\${c}`)
    const pattern = `%${escaped}%`
    q = q.or(
      `title.ilike.${pattern},excerpt.ilike.${pattern},body.ilike.${pattern}`,
    )
  }

  if (options.askCategory) {
    q = q.eq('ask_category', options.askCategory)
  }
  if (options.askStatus) {
    q = q.eq('ask_status', options.askStatus)
  }

  // Featured posts float to the top, then everything by published
  // date. NULLS LAST keeps un-featured below featured deterministically.
  const { data } = await q
    .order('featured_at', { ascending: false, nullsFirst: false })
    .order('published_at', { ascending: false })
    .limit(100)
    .returns<RawPostRow[]>()

  return (data ?? []).map((p) => ({
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    body: p.body,
    cover_url: p.cover_url,
    published_at: p.published_at,
    kind: p.kind,
    featured_at: p.featured_at,
    is_archived: p.is_archived ?? false,
    framework: p.framework,
    ask_category: p.ask_category,
    ask_status: p.ask_status,
    star_rating: p.star_rating,
    author: p.author,
  }))
}
