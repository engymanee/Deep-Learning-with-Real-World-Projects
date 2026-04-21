'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { getPermissions } from '@/lib/roles'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FileText, Video, Link as LinkIcon, Copy } from 'lucide-react'

interface Resource {
  id: string
  title: string
  description: string
  resourceType: 'document' | 'video' | 'template' | 'link'
  url: string
  forRoles?: string[]
}

const MOCK_RESOURCES: Resource[] = [
  {
    id: '1',
    title: 'Leadership Fundamentals Guide',
    description: 'Comprehensive guide covering core leadership competencies and practices',
    resourceType: 'document',
    url: 'https://example.com/docs/leadership-guide.pdf',
  },
  {
    id: '2',
    title: 'Building Trust in Teams Video',
    description: 'Expert video on creating psychological safety and building trust',
    resourceType: 'video',
    url: 'https://example.com/videos/trust-building',
  },
  {
    id: '3',
    title: 'Team Reflection Template',
    description: 'Template for facilitating team reflections after modules',
    resourceType: 'template',
    url: 'https://example.com/templates/reflection.docx',
    forRoles: ['facilitator', 'admin'],
  },
  {
    id: '4',
    title: 'Facilitator Resource Hub',
    description: 'Collection of facilitator resources and guides',
    resourceType: 'link',
    url: 'https://example.com/facilitator-hub',
    forRoles: ['facilitator', 'admin'],
  },
  {
    id: '5',
    title: 'Data Analysis Workbook',
    description: 'Interactive workbook for analyzing school performance data',
    resourceType: 'document',
    url: 'https://example.com/workbook/data-analysis.xlsx',
  },
  {
    id: '6',
    title: 'Change Management Strategies',
    description: 'Video series on leading organizational change',
    resourceType: 'video',
    url: 'https://example.com/videos/change-management',
  },
]

export default function ResourcesPage() {
  const { user } = useUser()
  const permissions = getPermissions(user.role)
  const [filter, setFilter] = useState<'all' | 'document' | 'video' | 'template' | 'link'>('all')

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />
      case 'link':
        return <LinkIcon className="w-5 h-5" />
      case 'document':
        return <FileText className="w-5 h-5" />
      case 'template':
        return <Copy className="w-5 h-5" />
      default:
        return <FileText className="w-5 h-5" />
    }
  }

  const getColorClass = (type: string) => {
    switch (type) {
      case 'video':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'link':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'document':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'template':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  // Filter resources based on current role
  const availableResources = MOCK_RESOURCES.filter((resource) => {
    if (resource.forRoles && !resource.forRoles.includes(user.role)) {
      return false
    }
    return true
  })

  const filteredResources =
    filter === 'all'
      ? availableResources
      : availableResources.filter((r) => r.resourceType === filter)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="mb-8">
          <Link href="/">
            <Button variant="outline" className="mb-4">
              ← Back to Home
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Learning Resources</h1>
          <p className="text-gray-600 mt-2">
            Browse curated documents, videos, templates, and links for your learning
          </p>
        </div>

        {/* Filter buttons */}
        <div className="mb-8 flex flex-wrap gap-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Resources ({availableResources.length})
          </Button>
          <Button
            variant={filter === 'document' ? 'default' : 'outline'}
            onClick={() => setFilter('document')}
          >
            Documents
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'outline'}
            onClick={() => setFilter('video')}
          >
            Videos
          </Button>
          <Button
            variant={filter === 'template' ? 'default' : 'outline'}
            onClick={() => setFilter('template')}
          >
            Templates
          </Button>
          <Button
            variant={filter === 'link' ? 'default' : 'outline'}
            onClick={() => setFilter('link')}
          >
            Links
          </Button>
        </div>

        {filteredResources.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-500 text-center py-12">
                No resources available in this category for your role.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredResources.map((resource) => (
              <Card
                key={resource.id}
                className={`hover:shadow-lg transition-shadow border-2 ${getColorClass(resource.resourceType)}`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <CardTitle className="text-base">{resource.title}</CardTitle>
                    </div>
                    <Badge variant="outline" className={getColorClass(resource.resourceType)}>
                      <div className="flex items-center gap-1">
                        {getIcon(resource.resourceType)}
                      </div>
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">{resource.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                  >
                    <Button className="w-full" size="sm">
                      Open Resource →
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info for role-specific content */}
        {permissions.canAuthorCurriculum && (
          <Card className="mt-12 bg-purple-50 border-purple-200">
            <CardHeader>
              <CardTitle className="text-purple-900">Admin Resources</CardTitle>
              <CardDescription>Manage and organize learning resources</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-700 mb-4">
                As an admin, you can add, edit, and organize resources for all users in the program.
              </p>
              <Button variant="outline">Add New Resource</Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
