'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageEditor } from '@/components/custom-pages/page-editor'
import { ImageGallery } from '@/components/custom-pages/image-gallery'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CustomPage, PageImage, PageBlock } from '@/lib/custom-pages/types'

interface PageEditorPageProps {
  params: { pageId?: string }
}

export default function PageEditorPage({ params }: PageEditorPageProps) {
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

  // Fetch page data if editing
  const handleSavePage = async (updates: Partial<CustomPage>) => {
    setIsSaving(true)
    try {
      // TODO: Save to API
      console.log('Saving page:', updates)
      setIsSaving(false)
    } catch (error) {
      console.error('Error saving page:', error)
      setIsSaving(false)
    }
  }

  const handlePublish = async (published: boolean) => {
    setIsSaving(true)
    try {
      // TODO: Publish via API
      console.log('Publishing page:', published)
      setPage({ ...page, is_published: published })
      setIsSaving(false)
    } catch (error) {
      console.error('Error publishing page:', error)
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
        const error = await response.json()
        throw new Error(error.error || 'Upload failed')
      }

      const uploadedImage = await response.json()
      setImages([...images, uploadedImage])
      setIsUploading(false)
    } catch (error) {
      console.error('Upload error:', error)
      setIsUploading(false)
      throw error
    }
  }

  const handleDeleteImage = async (imageId: string) => {
    try {
      const response = await fetch(`/api/admin/custom-pages/images/${imageId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Delete failed')
      }

      setImages(images.filter((img) => img.id !== imageId))
    } catch (error) {
      console.error('Delete error:', error)
      throw error
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
    } catch (error) {
      console.error('Update error:', error)
      throw error
    }
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
