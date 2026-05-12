import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export async function GET() {
  const supabase = await createClient()

  try {
    // Get navigation labels from the database
    const { data, error } = await supabase
      .from('navigation_labels')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found, which is fine
      throw error
    }

    // Return default labels if none exist
    return Response.json(
      data || {
        dashboard: 'Dashboard',
        about: 'About',
        library: 'Library',
        community: 'Community',
      }
    )
  } catch (error) {
    console.error('[v0] Error fetching navigation labels:', error)
    return Response.json(
      {
        dashboard: 'Dashboard',
        about: 'About',
        library: 'Library',
        community: 'Community',
      },
      { status: 200 }
    )
  }
}

export async function PUT(request: Request) {
  await requireAdmin()
  const supabase = await createClient()

  try {
    const labels = await request.json()

    // Validate labels
    if (
      !labels.dashboard ||
      !labels.about ||
      !labels.library ||
      !labels.community
    ) {
      return Response.json({ error: 'All labels are required' }, { status: 400 })
    }

    // Get existing record to know if we need to insert or update
    const { data: existing } = await supabase
      .from('navigation_labels')
      .select('id')
      .single()

    let result
    if (existing) {
      // Update existing
      result = await supabase
        .from('navigation_labels')
        .update(labels)
        .eq('id', existing.id)
        .select()
        .single()
    } else {
      // Insert new
      result = await supabase
        .from('navigation_labels')
        .insert([labels])
        .select()
        .single()
    }

    if (result.error) throw result.error

    return Response.json(result.data)
  } catch (error) {
    console.error('[v0] Error updating navigation labels:', error)
    return Response.json(
      { error: 'Failed to update navigation labels' },
      { status: 500 }
    )
  }
}
