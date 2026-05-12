import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { PagesList } from '@/components/custom-pages/pages-list'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export const metadata = {
  title: 'Custom Pages | Admin',
  description: 'Create and manage custom pages with images and content blocks',
}

export default async function CustomPagesPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Fetch all custom pages
  const { data: pages } = await supabase
    .from('custom_pages')
    .select('*')
    .order('created_at', { ascending: false })

  async function deletePage(pageId: string) {
    'use server'
    const supabase = await createClient()
    const { error } = await supabase
      .from('custom_pages')
      .delete()
      .eq('id', pageId)

    if (error) {
      throw new Error(`Failed to delete page: ${error.message}`)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section>
        <h1 className="font-serif text-3xl font-bold text-foreground">
          Custom Pages
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Create custom pages with image support, text content, and block-based layouts. Publish pages to make them available to all users.
        </p>
      </section>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Pages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{pages?.length || 0}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Published</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {pages?.filter((p) => p.is_published).length || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Drafts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {pages?.filter((p) => !p.is_published).length || 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pages List */}
      <PagesList
        pages={pages || []}
        onDelete={deletePage}
      />
    </div>
  )
}
