'use client'

import { useState } from 'react'
import { useUser } from '@/lib/user-context'
import { AppShell } from '@/components/app-shell'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Calendar } from 'lucide-react'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TeamMember {
  id: string
  name: string
  avatar: string
  currentYear: number
  currentModule: string
  progress: number
  lastActive: string // "Active 2h ago" or "Active Tuesday" or "Active yesterday"
}

interface TeamSnapshot {
  teamProgress: number // average % across members
  sessionsAttended: number
  sessionsTotal: number
  reflectionsShared: number
}

interface TeamSession {
  id: string
  title: string
  facilitators: { id: string; name: string; avatar: string }[]
  startTime: Date
  endTime: Date
  isLive: boolean
}

interface TeamReflection {
  id: string
  author: string
  timestamp: Date
  excerpt: string
  module: string
}

// ============================================================================
// MOCK DATA
// ============================================================================

const MOCK_TEAM_NAME = 'Lincoln High Leadership Team'
const MOCK_SCHOOL = 'Lincoln High School'
const MOCK_CITY_COUNTRY = 'Chicago, Illinois'

const MOCK_TEAM_MEMBERS: TeamMember[] = [
  {
    id: 'tm-1',
    name: 'Alex Kim',
    avatar: 'AK',
    currentYear: 1,
    currentModule: 'Foundations',
    progress: 78,
    lastActive: 'Active 2h ago',
  },
  {
    id: 'tm-2',
    name: 'Morgan Patel',
    avatar: 'MP',
    currentYear: 1,
    currentModule: 'Foundations',
    progress: 45,
    lastActive: 'Active Tuesday',
  },
  {
    id: 'tm-3',
    name: 'Jordan Davis',
    avatar: 'JD',
    currentYear: 1,
    currentModule: 'Team Dynamics',
    progress: 65,
    lastActive: 'Active yesterday',
  },
  {
    id: 'tm-4',
    name: 'Casey Lee',
    avatar: 'CL',
    currentYear: 1,
    currentModule: 'Foundations',
    progress: 52,
    lastActive: 'Active 3d ago',
  },
  {
    id: 'tm-5',
    name: 'Taylor Martinez',
    avatar: 'TM',
    currentYear: 1,
    currentModule: 'Team Dynamics',
    progress: 88,
    lastActive: 'Active 1h ago',
  },
  {
    id: 'tm-6',
    name: 'Riley Chen',
    avatar: 'RC',
    currentYear: 1,
    currentModule: 'Foundations',
    progress: 71,
    lastActive: 'Active Monday',
  },
]

const MOCK_TEAM_SNAPSHOT: TeamSnapshot = {
  teamProgress: Math.round(
    MOCK_TEAM_MEMBERS.reduce((acc, m) => acc + m.progress, 0) / MOCK_TEAM_MEMBERS.length
  ),
  sessionsAttended: 8,
  sessionsTotal: 10,
  reflectionsShared: 24,
}

const MOCK_TEAM_SESSION: TeamSession = {
  id: 'ts-1',
  title: 'Team Coaching Session: Module Check-in',
  facilitators: [
    { id: 'fac-1', name: 'Dr. Sarah Chen', avatar: 'SC' },
  ],
  startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
  endTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000),
  isLive: false,
}

const MOCK_TEAM_REFLECTIONS: TeamReflection[] = [
  {
    id: 'ref-1',
    author: 'Alex Kim',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    excerpt:
      'This module really helped me understand the dynamics at play in our leadership team. I noticed how we make decisions differently under pressure...',
    module: 'Team Dynamics & Communication',
  },
  {
    id: 'ref-2',
    author: 'Taylor Martinez',
    timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    excerpt:
      'I appreciated how the facilitator connected the case studies to real situations we face. Made me think about trust differently...',
    module: 'Building Trust',
  },
  {
    id: 'ref-3',
    author: 'Riley Chen',
    timestamp: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    excerpt: 'The reflection exercise at the end was powerful. Our team spent an extra 30 minutes discussing after the session ended...',
    module: 'Foundations',
  },
]

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function formatSessionDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

function formatReflectionTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000))
    if (diffHours < 1) return 'just now'
    return `${diffHours}h ago`
  }
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

// ============================================================================
// COMPONENTS
// ============================================================================

function TeamHeader({
  teamName,
  school,
  cityCountry,
  canInvite,
}: {
  teamName: string
  school: string
  cityCountry: string
  canInvite: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-8 mb-12">
      <div>
        <h1 className="font-serif text-4xl text-primary mb-1">{teamName}</h1>
        <p className="text-text-muted">{school}</p>
        {cityCountry && <p className="text-xs text-text-muted mt-1">{cityCountry}</p>}
      </div>
      {canInvite && (
        <Button size="sm" variant="outline" tabIndex={0}>
          + Invite a teammate
        </Button>
      )}
    </div>
  )
}

function SnapshotCard({
  label,
  value,
  stat,
  progress,
}: {
  label: string
  value: string | number
  stat?: string
  progress?: number
}) {
  return (
    <Card className="bg-white border-border shadow-card">
      <CardContent className="p-6 space-y-3">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">{label}</p>
        <div className="space-y-2">
          <div className="text-3xl font-serif font-bold text-primary">{value}</div>
          {stat && <p className="text-xs text-text-muted">{stat}</p>}
          {progress !== undefined && (
            <Progress value={progress} className="h-1.5 mt-2" />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function TeamMemberRow({ member, canNudge }: { member: TeamMember; canNudge: boolean }) {
  const [nudgeShown, setNudgeShown] = useState(false)

  return (
    <div
      className="flex items-center justify-between gap-4 py-4 px-4 rounded-lg hover:bg-bg-subtle transition-colors border-b border-border last:border-0"
      key={member.id}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-bg-muted text-sm">{member.avatar}</AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-text truncate">{member.name}</p>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Year {member.currentYear} · {member.currentModule}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 flex-shrink-0">
        <div className="w-24 space-y-1">
          <Progress value={member.progress} className="h-1" />
          <p className="text-xs text-text-muted text-right">{member.progress}%</p>
        </div>

        <p className="text-xs text-text-muted w-24 text-right">{member.lastActive}</p>

        {canNudge && (
          <div className="relative">
            <Button
              size="sm"
              variant="ghost"
              className="text-accent hover:text-primary"
              onClick={() => {
                setNudgeShown(true)
                setTimeout(() => setNudgeShown(false), 2000)
              }}
              tabIndex={0}
            >
              Nudge
            </Button>
            {nudgeShown && (
              <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-primary text-white text-xs rounded whitespace-nowrap shadow-card">
                Nudge sent
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function UpcomingSessionCard({ session }: { session: TeamSession }) {
  return (
    <Card className="bg-white border-border shadow-card">
      <CardContent className="p-8">
        <div className="space-y-6">
          <div>
            <h3 className="font-serif text-lg text-primary">{session.title}</h3>
            <p className="text-sm text-text-muted mt-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              {formatSessionDateTime(session.startTime)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {session.facilitators.map((fac) => (
                <Avatar key={fac.id} className="w-7 h-7 border border-white">
                  <AvatarFallback className="text-xs bg-bg-muted">{fac.avatar}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-xs text-text-muted">
              {session.facilitators.map((f) => f.name).join(', ')}
            </span>
          </div>

          <Button size="sm" tabIndex={0}>
            Join Session
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function TeamReflectionItem({ reflection }: { reflection: TeamReflection }) {
  return (
    <div className="py-6 px-4 border-b border-border last:border-0 space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-text">{reflection.author}</p>
          </div>
          <p className="text-xs text-text-muted mt-1">{formatReflectionTime(reflection.timestamp)}</p>
        </div>
      </div>

      <p className="text-sm text-text-muted">{reflection.module}</p>
      <p className="text-sm text-text leading-relaxed line-clamp-3">{reflection.excerpt}</p>

      <button className="text-accent hover:text-primary transition-colors text-sm font-medium" tabIndex={0}>
        View →
      </button>
    </div>
  )
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function TeamPage() {
  const { user } = useUser()
  const canInvite = user.role === 'admin'
  const canNudge = false

  return (
    <AppShell showSidebar={false}>
      <div className="space-y-12">
        {/* Team Header */}
        <TeamHeader
          teamName={MOCK_TEAM_NAME}
          school={MOCK_SCHOOL}
          cityCountry={MOCK_CITY_COUNTRY}
          canInvite={canInvite}
        />

        {/* Team Snapshot - 3 Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <SnapshotCard
            label="Team progress"
            value={`${MOCK_TEAM_SNAPSHOT.teamProgress}%`}
            progress={MOCK_TEAM_SNAPSHOT.teamProgress}
          />
          <SnapshotCard
            label="Sessions attended"
            value={MOCK_TEAM_SNAPSHOT.sessionsAttended}
            stat={`of ${MOCK_TEAM_SNAPSHOT.sessionsTotal} scheduled`}
          />
          <SnapshotCard
            label="Reflections shared"
            value={MOCK_TEAM_SNAPSHOT.reflectionsShared}
            stat="in last 30 days"
          />
        </div>

        {/* Members Section */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-primary">Team members</h2>
          <Card className="bg-white border-border shadow-card divide-y divide-border">
            {MOCK_TEAM_MEMBERS.map((member) => (
              <TeamMemberRow
                key={member.id}
                member={member}
                canNudge={canNudge}
              />
            ))}
          </Card>
        </div>

        {/* Upcoming Team Session */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-primary">Upcoming team session</h2>
          <UpcomingSessionCard session={MOCK_TEAM_SESSION} />
        </div>

        {/* Team Reflections */}
        <div className="space-y-4">
          <h2 className="font-serif text-2xl text-primary">Team reflections</h2>
          <Card className="bg-white border-border shadow-card">
            <div className="divide-y divide-border">
              {MOCK_TEAM_REFLECTIONS.map((reflection) => (
                <TeamReflectionItem key={reflection.id} reflection={reflection} />
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
