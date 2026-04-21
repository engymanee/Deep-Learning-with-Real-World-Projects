'use client'

import React, { createContext, useContext } from 'react'
import { UserRole } from './roles'

export interface CurrentUser {
  id: string
  email: string
  fullName: string
  role: UserRole
  schoolName: string
  schoolTeamId?: string
  profileImageUrl?: string
  bio?: string
}

interface UserContextType {
  user: CurrentUser | null
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({
  initialUser,
  children,
}: {
  initialUser: CurrentUser | null
  children: React.ReactNode
}) {
  return (
    <UserContext.Provider value={{ user: initialUser }}>
      {children}
    </UserContext.Provider>
  )
}

/**
 * Returns the signed-in user. Throws if called outside a UserProvider OR
 * on a page with no authenticated user. Authenticated routes are gated
 * by middleware, so callers on /dashboard, /admin/*, etc. can treat the
 * return value as non-null.
 */
export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  if (!context.user) {
    throw new Error(
      'useUser called on an unauthenticated page. Gate the route behind middleware or check useMaybeUser() instead.',
    )
  }
  return { user: context.user }
}

/** Safe variant that returns null when there is no signed-in user. */
export function useMaybeUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useMaybeUser must be used within UserProvider')
  }
  return { user: context.user }
}
