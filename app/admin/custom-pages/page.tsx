import { requireAdmin } from '@/lib/auth-server'
import { createClient } from '@/lib/supabase/server'
import { PagesList } from '@/components/custom-pages/pages-list'
import { SetupDatabaseButton } from '@/components/admin/setup-database-button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Custom Pages | Admin',
  description: 'Create and manage custom pages with images and content blocks',
}

export default async function CustomPagesPage() {
  await requireAdmin()
  const supabase = await createClient()

  // Check if tables exist and fetch pages
  let pages = null
  let tableError = null

  const { data: fetchedPages, error: dbError } = await supabase
    .from('custom_pages')
    .select('*')
    .order('created_at', { ascending: false })

  if (dbError) {
    console.log('[v0] Database query error:', dbError)
    tableError = dbError.message
    pages = []
  } else {
    pages = fetchedPages
  }

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

  const isTableMissing = tableError?.includes('does not exist') || tableError?.includes('PGRST116')

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

      {/* Database Setup Alert */}
      {isTableMissing && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="space-y-2">
            <div>The custom pages database hasn&apos;t been initialized yet.</div>
            <SetupDatabaseButton />
          </AlertDescription>
        </Alert>
      )}

      {/* Info Cards */}
      {!isTableMissing && (
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
                {pages?.filter((p: any) => p.is_published).length || 0}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Drafts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {pages?.filter((p: any) => !p.is_published).length || 0}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pages List */}
      {!isTableMissing && (
        <PagesList
          pages={pages || []}
          onDelete={deletePage}
        />
      )}
    </div>
  )
}
