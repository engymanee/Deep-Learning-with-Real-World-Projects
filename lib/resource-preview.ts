/**
 * Utility functions for resource preview card detection and thumbnail extraction
 */

export type ResourceType = 'video' | 'document'

export interface ResourcePreviewData {
  type: ResourceType
  platform?: 'youtube' | 'vimeo'
  fileType?: string
  thumbnailUrl?: string
  isExternalLink: boolean
}

/**
 * Extract YouTube video ID from URL
 */
function extractYoutubeId(url: string): string | null {
  const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/
  const match = url.match(youtubeRegex)
  return match ? match[1] : null
}

/**
 * Extract Vimeo video ID from URL
 */
function extractVimeoId(url: string): string | null {
  const vimeoRegex = /vimeo\.com\/(\d+)/
  const match = url.match(vimeoRegex)
  return match ? match[1] : null
}

/**
 * Get YouTube thumbnail URL from video ID
 */
function getYoutubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

/**
 * Get Vimeo thumbnail URL from video ID
 * Uses Vimeo oEmbed API which is CORS-friendly
 */
async function getVimeoThumbnail(videoId: string): Promise<string | null> {
  try {
    const response = await fetch(`https://vimeo.com/api/v2/video/${videoId}.json`, {
      headers: { 'Accept': 'application/json' }
    })
    if (!response.ok) return null
    const data = await response.json()
    return data[0]?.thumbnail_large || data[0]?.thumbnail_medium || null
  } catch (error) {
    console.error('[v0] Failed to fetch Vimeo thumbnail:', error)
    return null
  }
}

/**
 * Get file extension from URL
 */
function getFileExtension(url: string): string | null {
  try {
    const pathname = new URL(url).pathname
    const match = pathname.match(/\.(\w+)$/)
    return match ? match[1].toLowerCase() : null
  } catch {
    return null
  }
}

/**
 * Map file extensions to readable file types
 */
function getFileType(extension: string | null): string {
  const fileTypeMap: Record<string, string> = {
    'pdf': 'PDF',
    'doc': 'Word',
    'docx': 'Word',
    'xls': 'Excel',
    'xlsx': 'Excel',
    'ppt': 'PowerPoint',
    'pptx': 'PowerPoint',
    'txt': 'Text',
    'zip': 'Archive',
    'png': 'Image',
    'jpg': 'Image',
    'jpeg': 'Image',
    'gif': 'Image',
  }
  return extension && fileTypeMap[extension] ? fileTypeMap[extension] : 'Document'
}

/**
 * Analyze resource URL and return preview data
 */
export async function analyzeResource(url: string): Promise<ResourcePreviewData> {
  if (!url) {
    return { type: 'document', isExternalLink: true }
  }

  // Check for YouTube
  const youtubeId = extractYoutubeId(url)
  if (youtubeId) {
    return {
      type: 'video',
      platform: 'youtube',
      thumbnailUrl: getYoutubeThumbnail(youtubeId),
      isExternalLink: true,
    }
  }

  // Check for Vimeo
  const vimeoId = extractVimeoId(url)
  if (vimeoId) {
    const thumbnail = await getVimeoThumbnail(vimeoId)
    return {
      type: 'video',
      platform: 'vimeo',
      thumbnailUrl: thumbnail || undefined,
      isExternalLink: true,
    }
  }

  // Treat as document
  const extension = getFileExtension(url)
  const fileType = getFileType(extension)

  return {
    type: 'document',
    fileType: extension || undefined,
    isExternalLink: true,
  }
}

/**
 * Get color for file type
 */
export function getFileTypeColor(fileType: string | undefined): string {
  const colorMap: Record<string, string> = {
    'PDF': 'bg-red-100 text-red-700',
    'Word': 'bg-blue-100 text-blue-700',
    'Excel': 'bg-green-100 text-green-700',
    'PowerPoint': 'bg-orange-100 text-orange-700',
    'Text': 'bg-gray-100 text-gray-700',
    'Archive': 'bg-purple-100 text-purple-700',
    'Image': 'bg-pink-100 text-pink-700',
  }
  const label = fileType || 'Document'
  return colorMap[label] || 'bg-gray-100 text-gray-700'
}

/**
 * Get icon name for file type (lucide-react icon)
 */
export function getFileTypeIcon(fileType: string | undefined): string {
  const iconMap: Record<string, string> = {
    'PDF': 'File',
    'Word': 'FileText',
    'Excel': 'Table2',
    'PowerPoint': 'Presentation',
    'Text': 'FileText',
    'Archive': 'Archive',
    'Image': 'Image',
  }
  return iconMap[fileType || 'Document'] || 'FileQuestion'
}

/**
 * Format duration in seconds to readable string (e.g., "12m" or "1h 23m")
 */
export function formatDuration(seconds: number | undefined): string | null {
  if (!seconds) return null
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`
}
