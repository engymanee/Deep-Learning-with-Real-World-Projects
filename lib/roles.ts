// Role definitions and permission system for Wisdom At Work.
// Three roles: Fellow (program participant), Facilitator (coach/grader),
// Admin (full program management).

export type UserRole = 'fellow' | 'facilitator' | 'admin'

export const ALL_ROLES: UserRole[] = ['fellow', 'facilitator', 'admin']

export const roleLabels: Record<UserRole, string> = {
  fellow: 'Fellow',
  facilitator: 'Facilitator',
  admin: 'Admin',
}

export interface RolePermissions {
  canViewContent: boolean
  canMarkResourceComplete: boolean
  canSubmitReflections: boolean
  canPostInDiscussions: boolean
  canJoinLiveSessions: boolean
  canViewTeamRoster: boolean
  canReadProgress: boolean
  canGradeFeedback: boolean
  canPostAnnouncements: boolean
  canScheduleSessions: boolean
  canManageCohorts: boolean
  canEnrollUsers: boolean
  canAuthorCurriculum: boolean
  canConfigureCalendar: boolean
  canViewAnalytics: boolean
  canManageIntegrations: boolean
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  fellow: {
    canViewContent: true,
    canMarkResourceComplete: true,
    canSubmitReflections: true,
    canPostInDiscussions: true,
    canJoinLiveSessions: true,
    canViewTeamRoster: true,
    canReadProgress: false,
    canGradeFeedback: false,
    canPostAnnouncements: false,
    canScheduleSessions: false,
    canManageCohorts: false,
    canEnrollUsers: false,
    canAuthorCurriculum: false,
    canConfigureCalendar: false,
    canViewAnalytics: false,
    canManageIntegrations: false,
  },
  facilitator: {
    canViewContent: true,
    canMarkResourceComplete: true,
    canSubmitReflections: true,
    canPostInDiscussions: true,
    canJoinLiveSessions: true,
    canViewTeamRoster: true,
    canReadProgress: true,
    canGradeFeedback: true,
    canPostAnnouncements: true,
    canScheduleSessions: true,
    canManageCohorts: false,
    canEnrollUsers: false,
    canAuthorCurriculum: false,
    canConfigureCalendar: false,
    canViewAnalytics: true,
    canManageIntegrations: false,
  },
  admin: {
    canViewContent: true,
    canMarkResourceComplete: true,
    canSubmitReflections: true,
    canPostInDiscussions: true,
    canJoinLiveSessions: true,
    canViewTeamRoster: true,
    canReadProgress: true,
    canGradeFeedback: true,
    canPostAnnouncements: true,
    canScheduleSessions: true,
    canManageCohorts: true,
    canEnrollUsers: true,
    canAuthorCurriculum: true,
    canConfigureCalendar: true,
    canViewAnalytics: true,
    canManageIntegrations: true,
  },
}

export function getPermissions(role: UserRole): RolePermissions {
  return rolePermissions[role] ?? rolePermissions.fellow
}

export const roleDescriptions: Record<UserRole, string> = {
  fellow:
    'School leader enrolled in a cohort. Can view assigned content, mark resources complete, submit reflections, join live sessions and discussions, and see their team roster.',
  facilitator:
    'Program staff who delivers modules and coaches cohorts. Can read progress, grade reflections, post announcements, schedule sessions, and review analytics.',
  admin:
    'Program manager with full access. Can invite users, assign roles and cohorts, author curriculum, manage the library and community, and promote cohorts through the three-year arc.',
}

export function isStaff(role: UserRole): boolean {
  return role === 'facilitator' || role === 'admin'
}

export function isAdmin(role: UserRole): boolean {
  return role === 'admin'
}

// Aliases used by the admin UI. Prefer these names in new code; the
// older `UserRole` / `roleLabels` exports are kept for backwards
// compatibility with the rest of the app.
export type Role = UserRole
export const ROLE_LABELS = roleLabels
