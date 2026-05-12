import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth-server'

export async function GET() {
  try {
    const supabase = await createClient()

    // Get navigation labels from the database - get all rows (should only be 1)
    const { data, error } = await supabase
      .from('navigation_labels')
      .select('*')
      .limit(1)

    if (error) {
      console.error('[v0] Error fetching navigation labels:', error)
      // Return defaults if any error
      return Response.json({
        dashboard: 'Dashboard',
        about: 'About',
        library: 'Library',
        community: 'Community',
      })
    }

    // If we have data, return the first row
    if (data && data.length > 0) {
      return Response.json(data[0])
    }

    // Return defaults if empty
    return Response.json({
      dashboard: 'Dashboard',
      about: 'About',
      library: 'Library',
      community: 'Community',
    })
  } catch (error) {
    console.error('[v0] Error in navigation labels GET:', error)
    return Response.json({
      dashboard: 'Dashboard',
      about: 'About',
      library: 'Library',
      community: 'Community',
    })
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin()
    const supabase = await createClient()
    const labels = await request.json()

    console.log('[v0] PUT navigation labels:', labels)

    // Validate labels
    if (
      !labels.dashboard ||
      !labels.about ||
      !labels.library ||
      !labels.community
    ) {
      return Response.json({ error: 'All labels are required' }, { status: 400 })
    }

    // Get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('navigation_labels')
      .select('id')
      .limit(1)

    if (fetchError) {
      console.error('[v0] Error fetching existing labels:', fetchError)
    }

    let result
    if (existing && existing.length > 0) {
      // Update existing record
      console.log('[v0] Updating existing record:', existing[0].id)
      result = await supabase
        .from('navigation_labels')
        .update({
          dashboard: labels.dashboard,
          about: labels.about,
          library: labels.library,
          community: labels.community,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing[0].id)
        .select()
        .single()
    } else {
      // Insert new record
      console.log('[v0] Inserting new record')
      result = await supabase
        .from('navigation_labels')
        .insert([
          {
            dashboard: labels.dashboard,
            about: labels.about,
            library: labels.library,
            community: labels.community,
          },
        ])
        .select()
        .single()
    }

    if (result.error) {
      console.error('[v0] Error updating/inserting labels:', result.error)
      throw result.error
    }

    console.log('[v0] Successfully saved labels:', result.data)
    return Response.json(result.data)
  } catch (error) {
    console.error('[v0] Error in navigation labels PUT:', error)
    return Response.json(
      { error: 'Failed to update navigation labels' },
      { status: 500 }
    )
  }
}
