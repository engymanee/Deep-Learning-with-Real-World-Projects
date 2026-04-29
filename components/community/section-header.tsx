import { Badge } from '@/components/ui/badge'
import { PostComposer } from '@/components/community/post-composer'
import type { CommunitySection } from '@/lib/community/sections'

interface Props {
  section: CommunitySection
  /** Total items in the section (posts or, for bios, profiles). */
  count: number
  /** Whether the current viewer can compose in this section. */
  canPost: boolean
}

/**
 * Header rendered at the top of every Community section page.
 * Keeps the layout consistent: section name, count badge, one-line
 * description, and (when allowed) the "New post" composer trigger.
 */
export function SectionHeader({ section, count, canPost }: Props) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="font-serif text-2xl text-foreground sm:text-3xl">
            {section.label}
          </h1>
          <Badge variant="outline" className="text-xs tabular-nums">
            {count}
          </Badge>
        </div>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          {section.description}
        </p>
      </div>

      {section.writeKind && (
        <div className="shrink-0">
          {/*
            Pass primitive fields only - PostComposer is a Client
            Component, and serializing the full section object would
            try to ship `section.icon` (a Lucide React component
            function) across the boundary, which React refuses.
          */}
          <PostComposer
            writeKind={section.writeKind}
            description={section.description}
            titlePlaceholder={section.composerTitlePlaceholder}
            bodyPlaceholder={section.composerBodyPlaceholder}
            composerCta={section.composerCta}
            canPost={canPost}
          />
        </div>
      )}
    </header>
  )
}
