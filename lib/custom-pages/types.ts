export type PageBlockType = 'text' | 'image' | 'combined'

export type HeaderPosition = 'before' | 'after' | 'hidden'

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
  // Header fields with position controls
  header1: string | null
  header1_position?: HeaderPosition
  header2: string | null
  header2_position?: HeaderPosition
  header3: string | null
  header3_position?: HeaderPosition
  cover_image_url?: string | null
  is_published: boolean
  show_in_menu: boolean
  blocks?: PageBlock[]
  created_by: string
  created_at: string
  updated_at: string
}


