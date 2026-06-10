'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  Building2,
  CalendarDays,
  Library,
  Megaphone,
  MessagesSquare,
  Users,
  Mail,
  FileText,
  Trash2,
  Pencil,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AdminPageContentSlot } from './admin-page-content-slot'

interface AdminPageContentItem {
  id: string
  page_id: string
  slot_name: string
  order_index: number
  title: string | null
  content: string
  created_at: string
}

interface AdminDashboardClientProps {
  adminName: string
  topItems: AdminPageContentItem[]
  bottomItems: AdminPageContentItem[]
}

export function AdminDashboardClient({
  adminName,
  topItems,
  bottomItems,
}: AdminDashboardClientProps) {
  const [isEditMode, setIsEditMode] = useState(false)

  return (
    <div className="flex flex-col gap-8">
      {/* Header with edit toggle */}
      <section className="flex items-center justify-between">
        <div>
          <h1 className="text-balance font-serif text-4xl text-foreground">
            Welcome Back, {adminName}
          </h1>
        </div>
        <Button
          variant={isEditMode ? 'default' : 'outline'}
          size="sm"
          onClick={() => setIsEditMode(!isEditMode)}
          className="gap-2"
        >
          {isEditMode ? (
            <>
              <Check className="h-4 w-4" />
              Done Editing
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" />
              Edit Page
            </>
          )}
        </Button>
      </section>

      {/* Top content slot */}
      {(isEditMode || topItems.length > 0) && (
        <AdminPageContentSlot
          pageId="admin"
          slotName="top"
          items={topItems}
          isEditMode={isEditMode}
          isAdmin={true}
        />
      )}

      {/* Greeting */}
      <section>
        <h2 className="font-serif text-2xl text-foreground">Quick Links</h2>
      </section>

      {/* Quick management actions */}
      <section>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <ActionCard
            href="/admin/users"
            icon={<Users className="h-5 w-5" />}
            title="Users & cohorts"
            description="Invite fellows, set roles, assign cohort labels, deactivate accounts."
          />
          <ActionCard
            href="/admin/schools"
            icon={<Building2 className="h-5 w-5" />}
            title="Schools & teams"
            description="Group fellows by school team for collaborative reporting and rosters."
          />
          <ActionCard
            href="/admin/curriculum"
            icon={<BookOpen className="h-5 w-5" />}
            title="Curriculum"
            description="Author phases, items, and content blocks. Assign each to one or more cohorts."
          />
          <ActionCard
            href="/admin/library"
            icon={<Library className="h-5 w-5" />}
            title="Library"
            description="Add, edit, and remove curated books, videos, podcasts, and other resources. Gate by cohort or publish as Recommended Resources."
          />
          <ActionCard
            href="/admin/community"
            icon={<MessagesSquare className="h-5 w-4" />}
            title="Community"
            description="Moderate posts and events surfaced in the fellow community feed."
          />
          <ActionCard
            href="/admin/notifications"
            icon={<Megaphone className="h-5 w-5" />}
            title="Notifications"
            description="Send announcements, reminders, and alerts. Targeted by cohort, school team, or specific fellows. Optionally email."
          />
          <ActionCard
            href="/admin/schedule"
            icon={<CalendarDays className="h-5 w-5" />}
            title="Scheduling"
            description="Create scheduling polls, invite specific fellows to vote on availability, and finalize event times like WhenToMeet."
          />
          <ActionCard
            href="/admin/email-logs"
            icon={<Mail className="h-5 w-5" />}
            title="Email Logs"
            description="Track all emails sent in the past week. Monitor delivery status and resend failed emails."
          />
          <ActionCard
            href="/admin/custom-pages"
            icon={<FileText className="h-5 w-5" />}
            title="Custom Pages"
            description="Create and manage custom pages with rich content blocks, images, and text. Publish to the public site with custom URLs."
          />
          <ActionCard
            href="/admin/maintenance"
            icon={<Trash2 className="h-5 w-5" />}
            title="Portal Maintenance"
            description="Clean up test data, duplicate content, and unused resources. Manage invitations, archive drafts, and review audit logs."
          />
        </div>
      </section>

      {/* Bottom content slot */}
      {(isEditMode || bottomItems.length > 0) && (
        <AdminPageContentSlot
          pageId="admin"
          slotName="bottom"
          items={bottomItems}
          isEditMode={isEditMode}
          isAdmin={true}
        />
      )}
    </div>
  )
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link href={href} className="group">
      <Card className="h-full transition-colors hover:border-foreground/30">
        <CardContent className="flex h-full flex-col gap-2 p-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            {icon}
          </span>
          <p className="font-serif text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs leading-tight text-muted-foreground line-clamp-2">{description}</p>
        </CardContent>
      </Card>
    </Link>
  )
}
