export type PageBlockType = 'text' | 'image' | 'combined'

export interface PageImage {
  id: string
  url: string
  filename: string
  width: number | null
  height: number | null
  alt_text: string | null
  size_bytes: number
  mime_type: string
  created_at: string
}

export interface PageBlock {
  id: string
  page_id: string
  block_type: PageBlockType
  order_number: number
  title: string | null
  content: string | null
  metadata: Record<string, any> | null
  image_id: string | null
  image?: PageImage | null
  created_at: string
  updated_at: string
}

export interface CustomPage {
  id: string
  title: string
  slug: string
  description: string | null
  is_published: boolean
  blocks?: PageBlock[]
  created_by: string
  created_at: string
  updated_at: string
}
