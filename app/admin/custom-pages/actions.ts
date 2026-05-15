'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidateTag } from 'next/cache'
import type { CustomPage, PageBlock } from '@/lib/custom-pages/types'

/**
 * Get all custom pages with pagination
 */
export async function getCustomPages(page: number = 1, pageSize: number = 20) {
  const admin = createAdminClient()

  try {
    const { data, error, count } = await admin
      .from('custom_pages')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    if (error) throw error

    return {
      pages: data as CustomPage[],
      total: count || 0,
      pageCount: Math.ceil((count || 0) / pageSize),
    }
  } catch (err) {
    console.error('[v0] Failed to get custom pages:', err)
    return { pages: [], total: 0, pageCount: 0 }
  }
}

/**
 * Get a single custom page with its blocks
 */
export async function getCustomPage(pageId: string) {
  const admin = createAdminClient()

  try {
    const { data: page, error: pageError } = await admin
      .from('custom_pages')
      .select('*')
      .eq('id', pageId)
      .single()

    if (pageError) throw pageError

    const { data: blocks, error: blocksError } = await admin
      .from('page_blocks')
      .select('*, page_images(*)')
      .eq('page_id', pageId)
      .order('order_number', { ascending: true })

    if (blocksError) throw blocksError

    return {
      page: page as CustomPage,
      blocks: blocks as (PageBlock & { page_images: any })[],
    }
  } catch (err) {
    console.error('[v0] Failed to get custom page:', err)
    return { page: null, blocks: [] }
  }
}

/**
 * Create a new custom page
 */
export async function createCustomPage(data: { title: string; slug: string; description?: string }) {
  const admin = createAdminClient()

  try {
    const { data: page, error } = await admin
      .from('custom_pages')
      .insert({
        title: data.title,
        slug: data.slug,
        description: data.description,
        is_published: false,
      })
      .select()
      .single()

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true, page: page as CustomPage }
  } catch (err) {
    console.error('[v0] Failed to create custom page:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create page' }
  }
}

/**
 * Update a custom page
 */
export async function updateCustomPage(
  pageId: string,
  data: {
    title?: string
    slug?: string
    description?: string
    is_published?: boolean
  }
) {
  const admin = createAdminClient()

  try {
    const { data: page, error } = await admin
      .from('custom_pages')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pageId)
      .select()
      .single()

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true, page: page as CustomPage }
  } catch (err) {
    console.error('[v0] Failed to update custom page:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update page' }
  }
}

/**
 * Delete a custom page
 */
export async function deleteCustomPage(pageId: string) {
  const admin = createAdminClient()

  try {
    const { error } = await admin.from('custom_pages').delete().eq('id', pageId)

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true }
  } catch (err) {
    console.error('[v0] Failed to delete custom page:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete page' }
  }
}

/**
 * Add a block to a page
 */
export async function addPageBlock(
  pageId: string,
  block: Omit<PageBlock, 'id' | 'created_at' | 'updated_at'>
) {
  const admin = createAdminClient()

  try {
    const { data, error } = await admin
      .from('page_blocks')
      .insert({
        page_id: pageId,
        ...block,
      })
      .select()
      .single()

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true, block: data as PageBlock }
  } catch (err) {
    console.error('[v0] Failed to add page block:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to add block' }
  }
}

/**
 * Update a page block
 */
export async function updatePageBlock(
  blockId: string,
  block: Partial<Omit<PageBlock, 'id' | 'created_at' | 'updated_at'>>
) {
  const admin = createAdminClient()

  try {
    const { data, error } = await admin
      .from('page_blocks')
      .update({
        ...block,
        updated_at: new Date().toISOString(),
      })
      .eq('id', blockId)
      .select()
      .single()

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true, block: data as PageBlock }
  } catch (err) {
    console.error('[v0] Failed to update page block:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update block' }
  }
}

/**
 * Delete a page block
 */
export async function deletePageBlock(blockId: string) {
  const admin = createAdminClient()

  try {
    const { error } = await admin.from('page_blocks').delete().eq('id', blockId)

    if (error) throw error

    revalidateTag('custom-pages')
    return { success: true }
  } catch (err) {
    console.error('[v0] Failed to delete page block:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete block' }
  }
}

/**
 * Reorder page blocks
 */
export async function reorderPageBlocks(pageId: string, blockIds: string[]) {
  const admin = createAdminClient()

  try {
    // Update each block with new order number
    const updates = blockIds.map((blockId, index) => ({
      id: blockId,
      order_number: index + 1,
      updated_at: new Date().toISOString(),
    }))

    const promises = updates.map((update) =>
      admin
        .from('page_blocks')
        .update({ order_number: update.order_number, updated_at: update.updated_at })
        .eq('id', update.id)
    )

    await Promise.all(promises)

    revalidateTag('custom-pages')
    return { success: true }
  } catch (err) {
    console.error('[v0] Failed to reorder page blocks:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Failed to reorder blocks' }
  }
}
