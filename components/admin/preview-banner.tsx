import { Eye, X } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth-server'
import { endPreview } from '@/app/admin/preview/actions'

/**
 * Sticky banner shown at the very top of every authenticated page while
 * an admin is in "Preview as fellow" mode. Renders nothing for normal
 * sessions. The exit button posts to a server action that clears the
 * preview cookie and redirects back to /admin.
 */
export async function AdminPreviewBanner() {
  const user = await getCurrentUser()
  if (!user?.preview) return null

  const { label, mode, actualAdminName } = user.preview

  return (
    // Rendered as a regular block element at the top of <body> so it
    // pushes the rest of the layout (including any sticky page top-bar)
    // down. Avoids overlap with fellow-facing TopBar that is also
    // `sticky top-0`.
    <div
      role="status"
      aria-live="polite"
      className="relative z-[60] w-full border-b border-warning/40 bg-warning/15"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-2 text-sm">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning/30 text-warning">
            <Eye className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="min-w-0 truncate text-foreground">
            <span className="font-medium">Preview mode</span>
            <span className="mx-2 text-muted-foreground">·</span>
            Viewing as{' '}
            <span className="font-medium">{label}</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {mode === 'by_fellow' ? 'fellow profile' : 'cohort sample'}
            </span>
            <span className="mx-2 hidden text-muted-foreground sm:inline">·</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              signed in as {actualAdminName}
            </span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <form action={endPreview}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs font-medium text-background hover:opacity-90"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Exit preview
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
