'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth-server'

interface AdminPageContentItem {
  id: string
  page_id: string
  slot_name: string
  order_index: number
  title: string | null
  content: string
  created_at: string
}

/**
 * Fetch all editable content for a given admin page and slot
 */
export async function getAdminPageContent(pageId: string, slotName?: string) {
  const user = await getCurrentUser()
  console.log('[v0] getAdminPageContent - user:', user?.email, 'role:', user?.role)
  
  if (!user || user.role !== 'admin') {
    console.log('[v0] getAdminPageContent - NOT ADMIN, returning unauthorized')
    return { ok: false, message: 'Unauthorized', data: [] }
  }

  const supabase = await createClient()

  let query = supabase
    .from('admin_page_content')
    .select('*')
    .eq('page_id', pageId)
    .order('order_index', { ascending: true })

  if (slotName) {
    query = query.eq('slot_name', slotName)
  }

  const { data, error } = await query

  if (error) {
    console.error('[v0] Failed to fetch admin page content:', error)
    return { ok: false, message: error.message, data: [] }
  }

  console.log('[v0] getAdminPageContent - success, data count:', data?.length || 0)
  return { ok: true, data: data || [] }
}

/**
 * Create a new editable content item
 */
export async function createAdminPageContent(payload: {
  page_id: string
  slot_name: string
  title?: string
  content: string
}) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return { ok: false, message: 'Unauthorized' }
  }

  const supabase = await createClient()

  // Get max order_index for this slot
  const { data: existing } = await supabase
    .from('admin_page_content')
    .select('order_index', { count: 'exact' })
    .eq('page_id', payload.page_id)
    .eq('slot_name', payload.slot_name)
    .order('order_index', { ascending: false })
    .limit(1)

  const order_index = existing && existing.length > 0 ? existing[0].order_index + 1 : 0

  const { error } = await supabase.from('admin_page_content').insert({
    page_id: payload.page_id,
    slot_name: payload.slot_name,
    title: payload.title || null,
    content: payload.content,
    order_index,
    created_by: user.id,
  })

  if (error) {
    console.error('[v0] Failed to create admin page content:', error)
    return { ok: false, message: error.message }
  }

  revalidatePath(`/admin`)
  return { ok: true, message: 'Content created' }
}

/**
 * Update an existing content item
 */
export async function updateAdminPageContent(
  id: string,
  updates: {
    title?: string
    content?: string
  }
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return { ok: false, message: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('admin_page_content')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) {
    console.error('[v0] Failed to update admin page content:', error)
    return { ok: false, message: error.message }
  }

  revalidatePath(`/admin`)
  return { ok: true, message: 'Content updated' }
}

/**
 * Delete a content item
 */
export async function deleteAdminPageContent(id: string) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return { ok: false, message: 'Unauthorized' }
  }

  const supabase = await createClient()

  const { error } = await supabase.from('admin_page_content').delete().eq('id', id)

  if (error) {
    console.error('[v0] Failed to delete admin page content:', error)
    return { ok: false, message: error.message }
  }

  revalidatePath(`/admin`)
  return { ok: true, message: 'Content deleted' }
}

/**
 * Reorder content items within a slot
 */
export async function reorderAdminPageContent(
  pageId: string,
  slotName: string,
  orderedIds: string[]
) {
  const user = await getCurrentUser()
  if (!user || user.role !== 'admin') {
    return { ok: false, message: 'Unauthorized' }
  }

  const supabase = await createClient()

  try {
    // Update all items in batch
    for (let i = 0; i < orderedIds.length; i++) {
      const { error } = await supabase
        .from('admin_page_content')
        .update({ order_index: i })
        .eq('id', orderedIds[i])

      if (error) throw error
    }

    revalidatePath(`/admin`)
    return { ok: true, message: 'Items reordered' }
  } catch (error) {
    console.error('[v0] Failed to reorder admin page content:', error)
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Reorder failed',
    }
  }
}
