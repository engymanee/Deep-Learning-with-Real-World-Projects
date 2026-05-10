import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type { CommunityPostListItem } from '@/components/community/post-feed'
import type { ReflectionItem } from '@/lib/community/load-reflections'

/**
 * Aggregated counters surfaced on the /community dashboard header
 * strip. All counts are scoped to the trailing 7 days so the widget
 * is "what changed this week" rather than a lifetime tally.
 */
export interface CommunityDashboardStats {
  newWins: number
  openAsks: number
  weekReflections: number
  newBios: number
}

/** Member-of-the-week card data, or null when no fellow is featured. */
export interface MemberOfTheWeek {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  title: string | null
  community_role: string | null
  looking_for: string | null
  willing_to_help: string | null
}

const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

interface RawPostRow {
  id: string
  kind: string
  title: string
  excerpt: string | null
  cover_url: string | null
  published_at: string | null
  featured_at: string | null
  is_archived: boolean | null
  framework_resource_id: string | null
  framework: {
    id: string
    title: string
    resource_url: string | null
  } | null
  ask_category: string | null
  ask_status: string | null
  author: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
}

/**
 * One round-trip per stat would be wasteful; we batch them with
 * `Promise.all` and rely on Supabase's exact-count head queries to
 * avoid pulling rows we don't render.
 */
export async function loadDashboardStats(): Promise<CommunityDashboardStats> {
  const supabase = await createClient()
  const since = new Date(Date.now() - ONE_WEEK_MS).toISOString()

  const [winsRes, asksRes, reflectionsRes, biosRes] = await Promise.all([
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'win')
      .eq('is_archived', false)
      .not('published_at', 'is', null)
      .gte('published_at', since),
    supabase
      .from('community_posts')
      .select('id', { count: 'exact', head: true })
      .in('kind', ['ask', 'question'])
      .eq('is_archived', false)
      .eq('ask_status', 'open')
      .not('published_at', 'is', null),
    supabase
      .from('user_content_reflections')
      .select('id', { count: 'exact', head: true })
      .neq('visibility', 'private')
      .gte('created_at', since),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .in('role', ['fellow', 'facilitator'])
      .is('deactivated_at', null)
      .gte('created_at', since),
  ])

  return {
    newWins: winsRes.count ?? 0,
    openAsks: asksRes.count ?? 0,
    weekReflections: reflectionsRes.count ?? 0,
    newBios: biosRes.count ?? 0,
  }
}

/**
 * Featured wins (and stories) for the dashboard rail. Admin curates
 * by setting `featured_at`; we surface the most recently featured
 * first so a fresh feature shows up immediately.
 */
export async function loadFeaturedWins(
  limit = 4,
): Promise<CommunityPostListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, cover_url, published_at,
      featured_at, is_archived,
      framework_resource_id, ask_category, ask_status,
      framework:framework_resource_id ( id, title, resource_url ),
      author:created_by ( id, full_name, email, avatar_url )
      `,
    )
    .in('kind', ['win', 'story'])
    .eq('is_archived', false)
    .not('published_at', 'is', null)
    .not('featured_at', 'is', null)
    .order('featured_at', { ascending: false })
    .limit(limit)
    .returns<RawPostRow[]>()

  return (data ?? []).map(toListItem)
}

/**
 * Most recent open asks. We deliberately skip closed/answered asks
 * so the rail nudges fellows toward unmet needs.
 */
export async function loadOpenAsks(
  limit = 6,
): Promise<CommunityPostListItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('community_posts')
    .select(
      `
      id, kind, title, excerpt, cover_url, published_at,
      featured_at, is_archived,
      framework_resource_id, ask_category, ask_status,
      framework:framework_resource_id ( id, title, resource_url ),
      author:created_by ( id, full_name, email, avatar_url )
      `,
    )
    .in('kind', ['ask', 'question'])
    .eq('is_archived', false)
    .eq('ask_status', 'open')
    .not('published_at', 'is', null)
    .order('published_at', { ascending: false })
    .limit(limit)
    .returns<RawPostRow[]>()

  return (data ?? []).map(toListItem)
}

interface RawReflectionRow {
  id: string
  body: string | null
  visibility: string
  created_at: string
  profile_id: string
  content_id: string | null
  profile: {
    id: string
    full_name: string | null
    email: string | null
    avatar_url: string | null
  } | null
  content: {
    id: string
    title: string | null
    lab: {
      id: string
      title: string | null
      phase: { id: string; title: string | null } | null
    } | null
  } | null
}

/**
 * Most recent public/cohort reflections sourced from programme
 * content. We pull the content + lab + phase so each card can show
 * the full breadcrumb back to the activity that prompted it.
 */
export async function loadRecentReflections(
  limit = 6,
): Promise<ReflectionItem[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('user_content_reflections')
    .select(
      `
      id, body, visibility, created_at, profile_id, content_id,
      profile:profile_id ( id, full_name, email, avatar_url ),
      content:content_id (
        id, title,
        lab:lab_id ( id, title, phase:phase_id ( id, title ) )
      )
      `,
    )
    .neq('visibility', 'private')
    .order('created_at', { ascending: false })
    .limit(limit)
    .returns<RawReflectionRow[]>()

  return (data ?? []).map((r) => ({
    id: r.id,
    body: r.body ?? '',
    visibility: r.visibility as 'public' | 'cohort' | 'private',
    created_at: r.created_at,
    profile: r.profile,
    content: r.content
      ? {
          id: r.content.id,
          title: r.content.title,
          lab: r.content.lab
            ? {
                id: r.content.lab.id,
                title: r.content.lab.title,
                phase: r.content.lab.phase
                  ? {
                      id: r.content.lab.phase.id,
                      title: r.content.lab.phase.title,
                    }
                  : null,
              }
            : null,
        }
      : null,
    isOwn: false,
    comments: [],
  }))
}

/**
 * Returns the current member of the week, or null when no profile is
 * actively featured (i.e. `featured_member_from <= now < featured_member_until`).
 * Admins set the window from the user edit page.
 */
export async function loadMemberOfTheWeek(): Promise<MemberOfTheWeek | null> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data } = await supabase
    .from('profiles')
    .select(
      `
      id, full_name, email, avatar_url, title,
      community_role, looking_for, willing_to_help,
      featured_member_from, featured_member_until
      `,
    )
    .in('role', ['fellow', 'facilitator'])
    .is('deactivated_at', null)
    .lte('featured_member_from', now)
    .gte('featured_member_until', now)
    .order('featured_member_from', { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string
      full_name: string | null
      email: string | null
      avatar_url: string | null
      title: string | null
      community_role: string | null
      looking_for: string | null
      willing_to_help: string | null
      featured_member_from: string | null
      featured_member_until: string | null
    }>()

  if (!data) return null
  return {
    id: data.id,
    full_name: data.full_name,
    email: data.email,
    avatar_url: data.avatar_url,
    title: data.title,
    community_role: data.community_role,
    looking_for: data.looking_for,
    willing_to_help: data.willing_to_help,
  }
}

function toListItem(p: RawPostRow): CommunityPostListItem {
  return {
    id: p.id,
    title: p.title,
    excerpt: p.excerpt,
    cover_url: p.cover_url,
    published_at: p.published_at,
    kind: p.kind,
    featured_at: p.featured_at,
    is_archived: p.is_archived ?? false,
    framework: p.framework,
    ask_category: p.ask_category,
    ask_status: p.ask_status,
    author: p.author,
  }
}
