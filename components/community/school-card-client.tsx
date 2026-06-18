'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface SchoolCardClientProps {
  id: string
  name?: string | null
  logo_url?: string | null
  description?: string | null
  location?: string | null
  contact_email?: string | null
  website_url?: string | null
}

export function SchoolCardClient({
  id,
  name,
  logo_url,
  description,
  location,
  contact_email,
  website_url,
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

        {/* School Name */}
        <div className="flex-1 text-left">
          <h3 className="font-serif text-lg font-semibold text-foreground">
            {name || 'Unnamed School'}
          </h3>
        </div>

        {/* Chevron Icon */}
        <ChevronDown
          className={`h-5 w-5 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Expanded Content - School Information */}
      {isExpanded && (
        <div className="border-t border-border">
          <div className="px-6 py-4 flex flex-col gap-4">
            {description && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  About
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {description}
                </p>
              </div>
            )}

            {location && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Location
                </h4>
                <p className="text-sm text-muted-foreground">{location}</p>
              </div>
            )}

            {contact_email && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Contact
                </h4>
                <a
                  href={`mailto:${contact_email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {contact_email}
                </a>
              </div>
            )}

            {website_url && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-foreground">
                  Website
                </h4>
                <a
                  href={website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  Visit school website
                </a>
              </div>
            )}

            {!description && !location && !contact_email && !website_url && (
              <p className="text-sm text-muted-foreground">
                No additional information available
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
