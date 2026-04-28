import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'
import { CommunityAdmin } from './community-admin'

export default async function AdminCommunityPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Admins see everything (including drafts and past events) to manage them.
  const [eventsRes, postsRes, resourcesRes] = await Promise.all([
    supabase
      .from('community_events')
      .select('id, title, description, starts_at, ends_at, location, join_url, created_at')
      .order('starts_at', { ascending: true }),
    supabase
      .from('community_posts')
      .select('id, kind, title, excerpt, body, media_url, cover_url, published_at, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('community_resources')
      .select('id, title, description, url, category, cohorts, created_at')
      .order('created_at', { ascending: false }),
  ])

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-xl text-foreground">Community of Practice</h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Shape the shared space fellows see at <span className="font-mono">/community</span>.
          Add events, publish posts and podcast notes, and curate the resource library.
        </p>
      </div>

      <CommunityAdmin
        events={eventsRes.data ?? []}
        posts={postsRes.data ?? []}
        resources={resourcesRes.data ?? []}
      />
    </div>
  )
}
