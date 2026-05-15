import { requireAdmin } from '@/lib/auth-server'
import { PagesList } from '@/components/custom-pages/pages-list'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getCustomPages, deleteCustomPage } from './actions'

export const metadata = {
  title: 'Custom Pages | Admin',
  description: 'Create and manage custom pages with images and content blocks',
}

export default async function CustomPagesPage() {
  await requireAdmin()

  // Fetch pages using server action
  const { pages, total, pageCount } = await getCustomPages(1, 20)
  const isTableMissing = total === 0 && !pages

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold text-foreground">
            Custom Pages
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
            Create custom pages with image support, text content, and block-based layouts. Publish pages to make them available to all users.
          </p>
        </div>
        <Link href="/admin/custom-pages/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Page
          </Button>
        </Link>
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
      <PagesList pages={pages || []} onDelete={deleteCustomPage} />
    </div>
  )
}
