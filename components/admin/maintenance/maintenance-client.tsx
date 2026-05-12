'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Users, BookOpen, Library, Megaphone, Bell, FileText, History, Edit2, Check, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
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
  const [editingLabel, setEditingLabel] = useState<Section | null>(null)
  const [editValues, setEditValues] = useState<Record<Section, string>>({
    users: 'Users',
    content: 'Content',
    library: 'Library',
    community: 'Community',
    notifications: 'Notifications',
    pages: 'Pages',
    audit: 'Audit Log',
  })

  const currentSection = sections.find((s) => s.id === activeSection)
  const CurrentComponent = currentSection?.component

  const handleRenameStart = (id: Section) => {
    setEditingLabel(id)
    setEditValues((prev) => ({
      ...prev,
      [id]: sections.find((s) => s.id === id)?.label || '',
    }))
  }

  const handleRenameSave = (id: Section) => {
    setEditingLabel(null)
  }

  const handleRenameCancel = () => {
    setEditingLabel(null)
  }

  const getDisplayLabel = (id: Section) => {
    return editValues[id] || sections.find((s) => s.id === id)?.label || ''
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
        {sections.map((section) => (
          <div key={section.id} className="relative group">
            <button
              onClick={() => setActiveSection(section.id)}
              className={`w-full transition-all duration-200 ${
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
                  {editingLabel === section.id ? (
                    <Input
                      autoFocus
                      type="text"
                      value={editValues[section.id]}
                      onChange={(e) =>
                        setEditValues((prev) => ({
                          ...prev,
                          [section.id]: e.target.value,
                        }))
                      }
                      onClick={(e) => e.stopPropagation()}
                      className="h-7 text-xs text-center p-1"
                    />
                  ) : (
                    getDisplayLabel(section.id)
                  )}
                </span>
              </CardContent>
            </Card>

            {/* Rename Button - visible on hover */}
            {editingLabel === section.id ? (
              <div className="absolute -bottom-9 right-0 flex gap-1 bg-background border rounded p-1 shadow-sm z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameSave(section.id)
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="Save"
                >
                  <Check className="h-3 w-3 text-green-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleRenameCancel()
                  }}
                  className="p-1 hover:bg-accent rounded"
                  title="Cancel"
                >
                  <X className="h-3 w-3 text-red-600" />
                </button>
              </div>
            ) : (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleRenameStart(section.id)
                }}
                className="absolute -bottom-9 right-0 p-1 opacity-0 group-hover:opacity-100 hover:bg-accent rounded transition-opacity bg-background border shadow-sm"
                title="Rename section"
              >
                <Edit2 className="h-3 w-3" />
              </button>
            )}
          </div>
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
