'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { PageEditor } from '@/components/custom-pages/page-editor'
import { ImageGallery } from '@/components/custom-pages/image-gallery'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import type { CustomPage, PageImage, PageBlock } from '@/lib/custom-pages/types'

interface PageEditorPageProps {
  params: Promise<{ pageId: string }>
}

export default function PageEditorPageClient({ params: paramPromise }: PageEditorPageProps) {
  const params = use(paramPromise)
  const router = useRouter()
  const isNewPage = params.pageId === 'new'

  const [page, setPage] = useState<CustomPage>({
    id: '',
    title: '',
    slug: '',
    description: '',
    is_published: false,
    blocks: [],
    created_by: '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  })

  const [images, setImages] = useState<PageImage[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(!isNewPage)
  const [error, setError] = useState<string | null>(null)

  // Fetch page data if editing
  useEffect(() => {
    if (params.pageId && params.pageId !== 'new') {
      fetchPage()
    }
  }, [params.pageId])

  const fetchPage = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/custom-pages?pageId=${params.pageId}`)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to load page')
      }

      const fetchedPage = await response.json()
      setPage({
        ...fetchedPage,
        blocks: fetchedPage.page_blocks || [],
      })
    } catch (err) {
      console.error('[v0] Error fetching page:', err)
      setError(err instanceof Error ? err.message : 'Failed to load page')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSavePage = async (updates: Partial<CustomPage>) => {
    setIsSaving(true)
    setError(null)
    try {
      const payload = {
        ...(isNewPage ? {} : { pageId: page.id }),
        title: updates.title || page.title,
        slug: updates.slug || page.slug,
        description: updates.description || page.description,
        is_published: updates.is_published ?? page.is_published,
        blocks: updates.blocks || page.blocks,
      }

      const method = isNewPage ? 'POST' : 'PATCH'
      const response = await fetch('/api/admin/custom-pages', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save page')
      }

      const savedPage = await response.json()
      setPage({
        ...savedPage,
        blocks: savedPage.page_blocks || updates.blocks || page.blocks,
      })

      if (isNewPage) {
        router.push(`/admin/custom-pages/${savedPage.id}`)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save page'
      console.error('[v0] Error saving page:', message)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async (published: boolean) => {
    setIsSaving(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/custom-pages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          title: page.title || 'Untitled Page',
          slug: page.slug || 'untitled-page',
          description: page.description || '',
          is_published: published,
          blocks: page.blocks || [],
        }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to update publish status')
      }

      const updated = await response.json()
      setPage({
        ...updated,
        blocks: updated.page_blocks || page.blocks,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update publish status'
      console.error('[v0] Error publishing:', message)
      setError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleUploadImage = async (file: File) => {
    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/custom-pages/images/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Upload failed')
      }

      const uploadedImage = await response.json()
      setImages([...images, uploadedImage])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      console.error('[v0] Upload error:', message)
      throw new Error(message)
    } finally {
      setIsUploading(false)
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/admin/custom-pages/images/${imageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Delete failed')
      }

      setImages(images.filter((img) => img.id !== imageId))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Delete failed'
      console.error('[v0] Delete error:', message)
      throw new Error(message)
    }
  }

  const handleUpdateImageAlt = async (imageId: string, altText: string) => {
    try {
      const response = await fetch(`/api/admin/custom-pages/images/${imageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alt_text: altText }),
      })

      if (!response.ok) {
        throw new Error('Failed to update image')
      }

      const updated = await response.json()
      setImages(images.map((img) => (img.id === imageId ? updated : img)))
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Update failed'
      console.error('[v0] Update error:', message)
      throw new Error(message)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">Loading page...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 py-6">
      <div>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          {isNewPage ? 'Create Page' : 'Edit Page'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build your page with text, images, and custom content blocks
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="content" className="w-full">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="images">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-6">
          <PageEditor
            page={page}
            availableImages={images}
            onSave={handleSavePage}
            onPublish={handlePublish}
            isSaving={isSaving}
            isPublished={page.is_published}
          />
        </TabsContent>

        <TabsContent value="images" className="space-y-6">
          <ImageGallery
            images={images}
            onUpload={handleUploadImage}
            onDelete={handleDeleteImage}
            onUpdateAlt={handleUpdateImageAlt}
            isUploading={isUploading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
