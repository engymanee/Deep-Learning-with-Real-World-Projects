'use client'

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Plus, Trash2, Upload, GripVertical, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { CustomPage, PageBlock, PageImage, PageBlockType } from '@/lib/custom-pages/types'

interface PageEditorProps {
  page: CustomPage
  availableImages: PageImage[]
  onSave: (page: Partial<CustomPage>) => Promise<void>
  onPublish: (published: boolean) => Promise<void>
  isSaving?: boolean
  isPublished?: boolean
}

export function PageEditor({
  page,
  availableImages,
  onSave,
  onPublish,
  isSaving = false,
  isPublished = false,
}: PageEditorProps) {
  const [title, setTitle] = useState(page.title)
  const [slug, setSlug] = useState(page.slug)
  const [description, setDescription] = useState(page.description || '')
  const [showInMenu, setShowInMenu] = useState(page.show_in_menu ?? true)
  const [blocks, setBlocks] = useState<PageBlock[]>(page.blocks || [])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Track if there are unsaved changes
  useEffect(() => {
    const currentContent = {
      title,
      slug,
      description,
      showInMenu,
      blocks: JSON.stringify(blocks),
    }

    const savedContent = {
      title: page.title,
      slug: page.slug,
      description: page.description || '',
      showInMenu: page.show_in_menu ?? true,
      blocks: JSON.stringify(page.blocks || []),
    }

    const hasChanges =
      currentContent.title !== savedContent.title ||
      currentContent.slug !== savedContent.slug ||
      currentContent.description !== savedContent.description ||
      currentContent.showInMenu !== savedContent.showInMenu ||
      currentContent.blocks !== savedContent.blocks

    setHasUnsavedChanges(hasChanges)
  }, [title, slug, description, showInMenu, blocks, page])

  const addBlock = (type: PageBlockType) => {
    const newBlock: PageBlock = {
      id: `temp-${Date.now()}`,
      page_id: page.id,
      block_type: type,
      order_number: blocks.length,
      title: type === 'combined' ? 'New Section' : null,
      content: type === 'text' ? '' : null,
      metadata: null,
      image_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    setBlocks([...blocks, newBlock])
  }

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId))
  }

  const updateBlock = (blockId: string, updates: Partial<PageBlock>) => {
    setBlocks(
      blocks.map((b) =>
        b.id === blockId
          ? { ...b, ...updates, updated_at: new Date().toISOString() }
          : b
      )
    )
  }

  const onDragEnd = (result: any) => {
    const { source, destination } = result
    if (!destination) return

    const newBlocks = Array.from(blocks)
    const [movedBlock] = newBlocks.splice(source.index, 1)
    newBlocks.splice(destination.index, 0, movedBlock)

    // Update order numbers
    const reordered = newBlocks.map((b, i) => ({ ...b, order_number: i }))
    setBlocks(reordered)
  }

  const handleSave = async () => {
    // Prepare blocks with image URLs populated in content field for image blocks
    const blocksWithImageContent = blocks.map((block) => {
      if (block.block_type === 'image' && block.image_id) {
        const image = getSelectedImage(block.image_id)
        return {
          ...block,
          content: image?.url || block.content,
        }
      }
      return block
    })

    await onSave({
      title,
      slug,
      description,
      show_in_menu: showInMenu,
      blocks: blocksWithImageContent,
    })
  }

  const getSelectedImage = (imageId: string | null) => {
    if (!imageId) return null
    return availableImages.find((img) => img.id === imageId)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle>Page Details</CardTitle>
          <CardDescription>Edit page metadata and content blocks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Page title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">URL Slug</label>
            <div className="flex gap-2">
              <span className="flex items-center px-3 bg-muted rounded-md text-sm text-muted-foreground">
                /pages/
              </span>
              <Input
                value={slug}
                onChange={(e) =>
                  setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                }
                placeholder="page-slug"
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description for this page"
              rows={3}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <input
              type="checkbox"
              id="show_in_menu"
              checked={showInMenu}
              onChange={(e) => setShowInMenu(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <label htmlFor="show_in_menu" className="flex-1 cursor-pointer">
              <div className="font-medium text-sm">Add to Navigation Menu</div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {showInMenu
                  ? 'This page will appear in the main navigation menu'
                  : 'This page will be hidden from the menu (still accessible via direct link)'}
              </p>
            </label>
          </div>

          {!page.id && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-900">
                Save your page as a draft first before publishing
              </AlertDescription>
            </Alert>
          )}

          {hasUnsavedChanges && page.id && (
            <Alert className="mt-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 inline mr-2 text-amber-900" />
              <AlertDescription className="text-amber-900">
                You have unsaved changes. Save to enable publishing these updates.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              variant={hasUnsavedChanges ? 'default' : 'outline'}
              className="flex-1"
            >
              {isSaving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              variant={isPublished ? 'secondary' : 'default'}
              onClick={() => onPublish(!isPublished)}
              disabled={!page.id || isSaving || hasUnsavedChanges}
              className="gap-2"
            >
              {isPublished ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Unpublish
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Publish
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Blocks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Content Blocks</CardTitle>
            <CardDescription>
              Add and arrange content blocks for your page
            </CardDescription>
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => addBlock('text')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Text
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addBlock('image')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Image
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => addBlock('combined')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Combined
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No content blocks yet. Add one to get started.
            </p>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="blocks">
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {blocks.map((block, index) => (
                      <Draggable key={block.id} draggableId={block.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`p-4 border rounded-lg transition ${
                              snapshot.isDragging ? 'bg-accent shadow-lg' : 'bg-card'
                            }`}
                          >
                            {/* Block Header */}
                            <div className="flex items-center gap-2 mb-3">
                              <span
                                {...provided.dragHandleProps}
                                className="text-muted-foreground hover:text-foreground"
                              >
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <Badge variant="outline">
                                {block.block_type.charAt(0).toUpperCase() +
                                  block.block_type.slice(1)}
                              </Badge>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeBlock(block.id)}
                                className="ml-auto text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Block Content */}
                            <div className="space-y-3">
                              {(block.block_type === 'text' || block.block_type === 'combined') && (
                                <>
                                  {block.block_type === 'combined' && (
                                    <div>
                                      <label className="block text-xs font-medium mb-1">
                                        Section Title
                                      </label>
                                      <Input
                                        value={block.title || ''}
                                        onChange={(e) =>
                                          updateBlock(block.id, { title: e.target.value })
                                        }
                                        placeholder="Section title"
                                        size="sm"
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <label className="block text-xs font-medium mb-1">
                                      Content
                                    </label>
                                    <textarea
                                      value={block.content || ''}
                                      onChange={(e) =>
                                        updateBlock(block.id, { content: e.target.value })
                                      }
                                      placeholder="Enter text content..."
                                      rows={3}
                                      className="w-full px-2 py-2 border rounded text-sm"
                                    />
                                  </div>
                                </>
                              )}

                              {(block.block_type === 'image' || block.block_type === 'combined') && (
                                <div>
                                  <label className="block text-xs font-medium mb-1">
                                    Image
                                  </label>
                                  <Select
                                    value={block.image_id || ''}
                                    onValueChange={(imageId) =>
                                      updateBlock(block.id, { image_id: imageId })
                                    }
                                  >
                                    <SelectTrigger size="sm">
                                      <SelectValue placeholder="Select an image..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {availableImages.map((img) => (
                                        <SelectItem key={img.id} value={img.id}>
                                          {img.filename}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  {block.image_id && (
                                    <div className="mt-2">
                                      <img
                                        src={getSelectedImage(block.image_id)?.url}
                                        alt="Preview"
                                        className="w-full max-h-40 object-cover rounded"
                                      />
                                      <Input
                                        value={getSelectedImage(block.image_id)?.alt_text || ''}
                                        placeholder="Alt text for image"
                                        className="mt-2 text-xs"
                                        size="sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
