# Phase 2: Code Changes Blueprint

## Overview

This document maps exact code changes needed to migrate from `cohort.school_id` + `profile.school_id` to `profile.school_team_id` → `school_teams`.

All changes use fallback logic: read school_teams first, fall back to old columns if needed. This allows gradual rollout.

---

## File 1: `/lib/auth-server.ts`

### Current Implementation

```typescript
export async function getCurrentUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) return null
  
  return {
    id: profile.id,
    email: profile.email,
    schoolTeamId: profile.school_id,  // ← OLD: direct to schools
    role: profile.role,
  }
}
```

### New Implementation

```typescript
export async function getCurrentUser() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile, error } = await supabase
    .from('profiles')
    .select(`
      id, email, role, 
      school_team_id,
      school_teams (
        id, school_id, cohort_id
      )
    `)
    .eq('id', user.id)
    .single()
  
  if (error) return null
  
  // Get school & cohort from school_teams if available
  const schoolTeamId = profile.school_team_id
  const schoolId = profile.school_teams?.school_id || null
  const cohortId = profile.school_teams?.cohort_id || null
  
  return {
    id: profile.id,
    email: profile.email,
    schoolTeamId,    // ← NEW: FK to school_teams
    schoolId,        // ← NEW: resolved from school_teams
    cohortId,        // ← NEW: resolved from school_teams
    role: profile.role,
  }
}
```

### Tests to Update

- ✅ `getCurrentUser()` returns schoolTeamId, schoolId, cohortId (not just school_id)
- ✅ Returns null for all three if profile.school_team_id is null
- ✅ Correctly joins school_teams and extracts school_id + cohort_id

---

## File 2: `/app/admin/schools/page.tsx`

### Current Query (Line 48)

```typescript
const { data: cohorts } = await supabase
  .from('cohorts')
  .select('id, school_id, name, current_year')
  .order('name')
```

### New Query

```typescript
const { data: schoolTeams } = await supabase
  .from('school_teams')
  .select(`
    id, 
    school_id,
    name,
    cohorts (
      id, name, current_year
    ),
    schools (
      id, name
    )
  `)
  .order('name')
```

### Current Grouping (Line 58)

```typescript
const cohortsBySchool = new Map<string, typeof cohorts>()
cohorts.forEach((c) => {
  if (!cohortsBySchool.has(c.school_id)) {
    cohortsBySchool.set(c.school_id, [])
  }
  cohortsBySchool.get(c.school_id)!.push(c)
})
```

### New Grouping

```typescript
const teamsBySchool = new Map<string, typeof schoolTeams>()
schoolTeams.forEach((team) => {
  if (!teamsBySchool.has(team.school_id)) {
    teamsBySchool.set(team.school_id, [])
  }
  teamsBySchool.get(team.school_id)!.push(team)
})
```

### Member Query (Line 68-70)

**Before:**
```typescript
cohorts: (
  await supabase
    .from('cohort_members')
    .select('profile_id')
    .eq('cohort_id', c.id)
)
```

**After:**
```typescript
members: (
  await supabase
    .from('cohort_members')
    .select('profile_id')
    .eq('cohort_id', team.cohorts.id)
)
```

### UI Rendering (Line 199)

**Before:**
```tsx
<h3 className="font-bold">
  Cohort {c.current_year === 1 ? 'A' : c.current_year === 2 ? 'B' : 'C'}
  ({c.id})
</h3>
```

**After:**
```tsx
<h3 className="font-bold">
  {team.name}
</h3>
```

---

## File 3: `/app/admin/users/page.tsx`

### Current Query (Line 73)

```typescript
const { data: userCohorts } = await supabase
  .from('cohort_members')
  .select(`
    cohort_id,
    cohorts (
      id, name
    )
  `)
  .eq('profile_id', user.id)
```

### New Query

```typescript
const { data: userTeams } = await supabase
  .from('profiles')
  .select(`
    school_team_id,
    school_teams (
      id, name, school_id, cohort_id
    )
  `)
  .eq('id', user.id)
```

### Display (Line 85)

**Before:**
```tsx
{userCohorts?.map((uc) => (
  <span key={uc.cohort_id}>{uc.cohorts.name}</span>
))}
```

**After:**
```tsx
{userTeams?.school_teams ? (
  <span key={userTeams.school_teams.id}>{userTeams.school_teams.name}</span>
) : (
  <span className="text-muted-foreground">Unassigned</span>
)}
```

---

## File 4: `/lib/invitations/invite.ts` - `applyProfileEnrichment()`

### Current Implementation

```typescript
export async function applyProfileEnrichment(
  supabase: SupabaseClient,
  profile: { id: string; email: string },
  payload: InvitePayload,
) {
  // Set profile.school_id
  await supabase
    .from('profiles')
    .update({ school_id: payload.schoolTeamId })
    .eq('id', profile.id)
  
  // Add to cohort_members
  if (payload.schoolTeamId) {
    await supabase
      .from('cohort_members')
      .insert({ profile_id: profile.id, cohort_id: payload.schoolTeamId })
  }
}
```

### New Implementation

```typescript
export async function applyProfileEnrichment(
  supabase: SupabaseClient,
  profile: { id: string; email: string },
  payload: InvitePayload,
) {
  if (!payload.schoolTeamId) return
  
  // Resolve schoolTeamId to get cohort_id
  const { data: schoolTeam, error: stError } = await supabase
    .from('school_teams')
    .select('id, cohort_id')
    .eq('id', payload.schoolTeamId)
    .single()
  
  if (stError || !schoolTeam) {
    throw new Error(`Failed to resolve school_team_id: ${payload.schoolTeamId}`)
  }
  
  // Update profile with school_team_id
  await supabase
    .from('profiles')
    .update({ school_team_id: schoolTeam.id })
    .eq('id', profile.id)
  
  // Add to cohort_members using the cohort from school_teams
  await supabase
    .from('cohort_members')
    .insert({ 
      profile_id: profile.id, 
      cohort_id: schoolTeam.cohort_id  // ← from school_teams
    })
    .on('*', (payload) => {
      console.log('[v0] cohort_members insert:', payload)
    })
}
```

---

## File 5: `/app/admin/users/actions.ts` - `addMemberAction()`

### Current Validation (Line 202)

```typescript
const { data: cohort } = await supabase
  .from('cohorts')
  .select('school_id')
  .eq('id', cohortId)
  .single()

const { data: profile } = await supabase
  .from('profiles')
  .select('school_id')
  .eq('id', userId)
  .single()

// Validate match
if (profile.school_id !== cohort.school_id) {
  return { ok: false, error: 'School mismatch' }
}
```

### New Validation

```typescript
// Resolve school_team from cohort + school
const { data: schoolTeam } = await supabase
  .from('school_teams')
  .select('id, cohort_id')
  .eq('cohort_id', cohortId)
  .eq('school_id', schoolId)  // Passed from form
  .single()

if (!schoolTeam) {
  return { ok: false, error: 'School team not found' }
}

// Update profile.school_team_id
await supabase
  .from('profiles')
  .update({ school_team_id: schoolTeam.id })
  .eq('id', userId)

// Add to cohort_members
await supabase
  .from('cohort_members')
  .insert({ 
    profile_id: userId, 
    cohort_id: schoolTeam.cohort_id 
  })
  .on('*', (payload) => {
    console.log('[v0] Added member to cohort:', payload)
  })
```

---

## File 6: `/lib/team-extras.ts`

### Current Implementation

```typescript
export async function getSchoolTeamLeadership(
  supabase: SupabaseClient,
  schoolId: string,
) {
  // Intentionally use profile.school_id, not cohort membership
  return await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('school_id', schoolId)  // ← OLD
    .in('role', ['facilitator', 'admin'])
}
```

### New Implementation

```typescript
export async function getSchoolTeamLeadership(
  supabase: SupabaseClient,
  schoolId: string,
) {
  // Get leadership via school_teams relationship
  return await supabase
    .from('profiles')
    .select(`
      id, full_name, role,
      school_teams (
        school_id
      )
    `)
    .eq('school_teams.school_id', schoolId)  // ← NEW via school_teams
    .in('role', ['facilitator', 'admin'])
}
```

---

## Fallback Strategy (for safe rollout)

All queries should implement fallback reads:

```typescript
// Example: Try school_teams first, fall back to cohort.school_id
let schoolId = null

if (profile.school_team_id) {
  const { data: st } = await supabase
    .from('school_teams')
    .select('school_id')
    .eq('id', profile.school_team_id)
    .single()
  schoolId = st?.school_id || null
} else if (profile.school_id) {
  // Fallback to old column
  schoolId = profile.school_id
}

return schoolId
```

This allows:
- Phase 2a: Deploy code with fallback reads (production safe)
- Phase 2b: Once verified, remove fallback logic
- Phase 3: Drop old columns

---

## Deployment Checklist

- [ ] All 6 files updated with school_teams reads
- [ ] Fallback logic in place for safe rollout
- [ ] Unit tests updated to mock school_teams
- [ ] Integration tests pass with new schema
- [ ] Code review approved
- [ ] Staging environment tested
- [ ] No regressions in schools UI or user listing
- [ ] Ready for production deploy

---

## Rollback Plan (Phase 2)

If issues discovered after Phase 2 deploy:

1. Revert code changes to previous commit
2. Restart app services
3. No database changes needed (old columns still exist)
4. Returns to reading profile.school_id + cohort.school_id

This is safe because Phase 1 left both old and new columns intact.
