'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, BookOpen, Library, Megaphone, Bell, FileText, History } from 'lucide-react'
import { UsersCleanupSection } from './users-cleanup'
import { ContentCleanupSection } from './content-cleanup'
import { LibraryCleanupSection } from './library-cleanup'
import { CommunityCleanupSection } from './community-cleanup'
import { NotificationsCleanupSection } from './notifications-cleanup'
import { CustomPagesCleanupSection } from './custom-pages-cleanup'
import { MaintenanceAuditLog } from './audit-log'

type Section = 'users' | 'content' | 'library' | 'community' | 'notifications' | 'pages' | 'audit'

interface SectionConfig {
  id: Section
  label: string
  icon: React.ReactNode
  component: React.ComponentType
}

const sections: SectionConfig[] = [
  {
    id: 'users',
    label: 'Users',
    icon: <Users className="h-5 w-5" />,
    component: UsersCleanupSection,
  },
  {
    id: 'content',
    label: 'Content',
    icon: <BookOpen className="h-5 w-5" />,
    component: ContentCleanupSection,
  },
  {
    id: 'library',
    label: 'Library',
    icon: <Library className="h-5 w-5" />,
    component: LibraryCleanupSection,
  },
  {
    id: 'community',
    label: 'Community',
    icon: <Megaphone className="h-5 w-5" />,
    component: CommunityCleanupSection,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: <Bell className="h-5 w-5" />,
    component: NotificationsCleanupSection,
  },
  {
    id: 'pages',
    label: 'Pages',
    icon: <FileText className="h-5 w-5" />,
    component: CustomPagesCleanupSection,
  },
  {
    id: 'audit',
    label: 'Audit Log',
    icon: <History className="h-5 w-5" />,
    component: MaintenanceAuditLog,
  },
]

export function MaintenanceClient() {
  const [activeSection, setActiveSection] = useState<Section>('users')

  const currentSection = sections.find((s) => s.id === activeSection)
  const CurrentComponent = currentSection?.component

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`transition-all duration-200 ${
              activeSection === section.id
                ? 'ring-2 ring-primary'
                : 'hover:shadow-md'
            }`}
          >
            <Card
              className={`cursor-pointer h-full ${
                activeSection === section.id
                  ? 'border-primary bg-primary/5'
                  : 'hover:bg-accent'
              }`}
            >
              <CardContent className="p-4 flex flex-col items-center justify-center gap-2 text-center h-full min-h-24">
                <div
                  className={`${
                    activeSection === section.id
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                >
                  {section.icon}
                </div>
                <span
                  className={`font-medium text-sm ${
                    activeSection === section.id
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {section.label}
                </span>
              </CardContent>
            </Card>
          </button>
        ))}
      </div>

      {/* Content Area */}
      {CurrentComponent && (
        <div className="mt-4">
          <CurrentComponent />
        </div>
      )}
    </div>
  )
}
