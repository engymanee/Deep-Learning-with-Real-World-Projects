'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  avatar_url: string | null
  title: string | null
  role: string
}

interface SchoolCardClientProps {
  id: string
  name: string | null
  logo_url: string | null
  members: TeamMember[]
}

export function SchoolCardClient({
  id,
  name,
  logo_url,
  members,
}: SchoolCardClientProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Header - Click to expand */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center gap-4 p-6 hover:bg-muted/50 transition-colors"
      >
        {/* Logo/Crest */}
        {logo_url ? (
          <img
            src={logo_url}
            alt={name || 'School logo'}
            className="h-20 w-20 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-serif text-muted-foreground">
              {name?.charAt(0) || '?'}
            </span>
          </div>
        )}

        {/* School Name and Member Count */}
        <div className="flex-1 text-left">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {name || 'Unnamed School'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {members.length} {members.length === 1 ? 'team member' : 'team members'}
          </p>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Content - Team Members */}
      {isExpanded && members.length > 0 && (
        <div className="border-t border-border">
          <div className="px-6 py-4">
            <h4 className="mb-4 font-semibold text-foreground">
              Leadership Team
            </h4>
            <div className="flex flex-col gap-3">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 rounded-md bg-muted/30 p-3"
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.full_name || 'Team member'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {member.full_name?.charAt(0) || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-foreground">
                      {member.full_name || 'Unnamed'}
                    </p>
                    {member.title && (
                      <p className="text-xs text-muted-foreground">
                        {member.title}
                      </p>
                    )}
                  </div>
                  <span className="text-xs rounded-full bg-primary/10 px-2 py-1 text-primary capitalize">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {isExpanded && members.length === 0 && (
        <div className="border-t border-border px-6 py-8 text-center">
          <p className="text-sm text-muted-foreground">
            No team members listed yet
          </p>
        </div>
      )}
    </div>
  )
}
