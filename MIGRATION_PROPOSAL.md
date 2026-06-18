# School Teams Migration Proposal

## Executive Summary

Current state: Database is empty (0 schools, 0 cohorts, 0 members). This proposal introduces a three-phase, non-destructive migration to a new `school_teams` entity that properly represents the (school × cohort) relationship while maintaining backward compatibility throughout.

**Core change:** Fellows link to `school_teams` (not cohorts), which own both the school and cohort relationship.

---

## Phase 1: Create & Backfill (Non-Destructive)

### New Table: `school_teams`

```sql
CREATE TABLE public.school_teams (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cohort_id             uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  name                  text NOT NULL,  -- e.g., "School X - Cohort A"
  created_at            timestamptz DEFAULT now(),
  
  -- Ensure no duplicate (school, cohort) pairs
  UNIQUE(school_id, cohort_id),
  
  -- Index for fast lookup by school
  INDEX idx_school_teams_school_id (school_id),
  INDEX idx_school_teams_cohort_id (cohort_id)
);
```

### Updated: `profiles` table

Add optional FK to school_teams:

```sql
ALTER TABLE public.profiles
  ADD COLUMN school_team_id uuid REFERENCES public.school_teams(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_school_team_id ON public.profiles(school_team_id);
```

**Why optional:** Admins (facilitators, etc.) may not be in a school team. Only fellows will have this set.

### Phase 1 SQL Migration

```sql
-- PHASE 1: CREATE & BACKFILL (NO DROPS)
-- =======================================

BEGIN;

-- Step 1: Create school_teams table
CREATE TABLE public.school_teams (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id             uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cohort_id             uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  name                  text NOT NULL,
  created_at            timestamptz DEFAULT now(),
  UNIQUE(school_id, cohort_id),
  INDEX idx_school_teams_school_id (school_id),
  INDEX idx_school_teams_cohort_id (cohort_id)
);

-- Step 2: Add school_team_id FK to profiles
ALTER TABLE public.profiles
  ADD COLUMN school_team_id uuid REFERENCES public.school_teams(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_school_team_id ON public.profiles(school_team_id);

-- Step 3: Backfill school_teams from existing cohorts + schools
-- For each (school_id, cohort_id) pair from cohorts table, create one school_team
INSERT INTO public.school_teams (school_id, cohort_id, name, created_at)
SELECT 
  c.school_id,
  c.id AS cohort_id,
  CONCAT(s.name, ' - Cohort ', 
    CASE c.current_year 
      WHEN 1 THEN 'A'
      WHEN 2 THEN 'B'
      WHEN 3 THEN 'C'
      ELSE c.current_year::text
    END
  ) AS name,
  COALESCE(c.created_at, now()) AS created_at
FROM public.cohorts c
LEFT JOIN public.schools s ON c.school_id = s.id
ON CONFLICT (school_id, cohort_id) DO NOTHING;  -- Idempotent

-- Step 4: Backfill profiles.school_team_id for fellows in cohort_members
UPDATE public.profiles p
SET school_team_id = st.id
FROM public.cohort_members cm
JOIN public.school_teams st ON st.cohort_id = cm.cohort_id
WHERE p.id = cm.profile_id
  AND p.role = 'fellow'
  AND p.school_team_id IS NULL;

-- Step 5: Verify backfill (informational)
-- Count fellows with school_team_id set
SELECT COUNT(*) as fellows_with_team_id
FROM public.profiles
WHERE role = 'fellow' AND school_team_id IS NOT NULL;

-- Count fellows in cohort_members without school_team_id
SELECT COUNT(*) as fellows_missing_team_id
FROM public.profiles p
JOIN public.cohort_members cm ON p.id = cm.profile_id
WHERE p.role = 'fellow' AND p.school_team_id IS NULL;

COMMIT;
```

### Backfill Logic Explained

**Current state (empty):** No cohorts, schools, or members exist.

**When real data exists, the backfill:**

1. **Reads:** `cohorts` table (school_id FK, current_year)
2. **Joins:** `schools` table (to get school name)
3. **Creates:** One `school_teams` row per `(school_id, cohort_id)` pair
4. **Generates:** Human-readable team name: "School X - Cohort A"
5. **Backfills:** `profiles.school_team_id` for all fellows in `cohort_members`

**Example scenario (after Phase 1 completes):**

```
Cohorts table:
- id: abc123, school_id: school-A, current_year: 1, name: 'Cohort 2024'
- id: def456, school_id: school-B, current_year: 1, name: 'Cohort 2024'

↓ Backfill creates school_teams:

School teams table:
- id: team-1, school_id: school-A, cohort_id: abc123, name: 'School A - Cohort A'
- id: team-2, school_id: school-B, cohort_id: def456, name: 'School B - Cohort A'

↓ Backfill updates profiles:

Profiles (fellows only):
- id: fellow-1, school_team_id: team-1  (was in cohort_members → cohort abc123)
- id: fellow-2, school_team_id: team-2  (was in cohort_members → cohort def456)
```

### Phase 1 Rollback

```sql
-- PHASE 1 ROLLBACK: Drop school_teams & revert profiles
-- ====================================================

BEGIN;

-- Step 1: Drop school_team_id column from profiles
ALTER TABLE public.profiles
  DROP COLUMN school_team_id;

-- Step 2: Drop school_teams table
DROP TABLE public.school_teams;

COMMIT;
```

---

## Phase 2: Repoint App (Code Changes)

### Overview

Migrate all code references from `cohort.school_id` + `profile.school_id` to `profile.school_team_id` → `school_teams` → `(school_id, cohort_id)`.

### Files to Update

**Priority 1 (Critical):**
1. `/lib/auth-server.ts` — Session construction
   - **Current:** Reads `profile.school_id` → session.schoolTeamId
   - **New:** Reads `profile.school_team_id` → JOIN school_teams to get schoolId & cohortId

2. `/app/admin/schools/page.tsx` — Schools & Teams UI
   - **Current:** Queries cohorts, groups by school_id
   - **New:** Queries school_teams, groups by school_id, displays team membership directly

3. `/app/admin/users/page.tsx` — User table
   - **Current:** Reads cohort_members → cohorts
   - **New:** Reads profiles.school_team_id → school_teams

**Priority 2 (Important):**
4. `/lib/invitations/invite.ts` — applyProfileEnrichment()
   - **Current:** Sets profile.school_id + inserts cohort_members
   - **New:** Resolves school_team_id, inserts cohort_members, updates profile.school_team_id

5. `/app/admin/users/actions.ts` — addMemberAction()
   - **Current:** Validates profile.school_id vs cohort.school_id
   - **New:** Sets profile.school_team_id directly

6. `/lib/team-extras.ts` — Team membership helpers
   - **Current:** Reads profile.school_id
   - **New:** Reads profile.school_team_id → school_id

### Example Code Change: auth-server.ts

**Before:**
```typescript
const sessionUser = {
  id: profile.id,
  email: profile.email,
  schoolTeamId: profile.school_id,  // ← direct FK to schools
  role: profile.role,
};
```

**After:**
```typescript
// Resolve school_team to get both schoolId and cohortId
const schoolTeam = profile.school_team_id 
  ? await supabase
      .from('school_teams')
      .select('school_id, cohort_id')
      .eq('id', profile.school_team_id)
      .single()
  : null;

const sessionUser = {
  id: profile.id,
  email: profile.email,
  schoolTeamId: profile.school_team_id,  // ← FK to school_teams
  schoolId: schoolTeam?.school_id,
  cohortId: schoolTeam?.cohort_id,
  role: profile.role,
};
```

### Phase 2 Deployment Strategy

1. **Deploy code changes** that read from school_teams BUT ALSO still read cohort.school_id as fallback
2. **Test extensively** in staging with real data (if available)
3. **Verify** all queries return correct results
4. **Once stable,** remove fallback reads (cleanup step for Phase 3)

---

## Phase 3: Cleanup & Deprecate (Optional)

### Remove Old Columns

Only after Phase 2 is stable and verified for 1+ week:

```sql
-- PHASE 3 CLEANUP: Drop cohort.school_id
-- ======================================

BEGIN;

-- Step 1: Verify no code reads cohort.school_id
-- (grep codebase for "cohort.school_id" — should be 0 results)

-- Step 2: Drop cohort.school_id column
ALTER TABLE public.cohorts
  DROP COLUMN school_id;

-- Step 3: Drop cohort FK from school_teams (optional, for safety)
-- Or keep it to maintain referential integrity and prevent orphaned teams

COMMIT;
```

### Phase 3 Rollback

```sql
-- PHASE 3 ROLLBACK: Restore cohort.school_id
-- ==========================================

BEGIN;

-- Step 1: Restore school_id column to cohorts
ALTER TABLE public.cohorts
  ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Step 2: Backfill cohort.school_id from school_teams
UPDATE public.cohorts c
SET school_id = st.school_id
FROM public.school_teams st
WHERE c.id = st.cohort_id;

CREATE INDEX idx_cohorts_school_id ON public.cohorts(school_id);

COMMIT;
```

---

## Summary of Changes

| Phase | Action | Downtime | Rollback Complexity |
|-------|--------|----------|----------------------|
| **1** | Create `school_teams`, backfill, add `profiles.school_team_id` | None | Low (DROP TABLE, ALTER DROP) |
| **2** | Update app code to read/write `school_teams` | ~5 min deploy | Medium (code rollback) |
| **3** | Drop `cohort.school_id` (optional) | None | Low (restore column, backfill) |

---

## Data Consistency Guarantees

After Phase 1:
- ✅ No duplicate (school_id, cohort_id) pairs
- ✅ Every fellow with cohort_members has school_team_id set
- ✅ Every school_team references valid school & cohort
- ✅ cohort_members rows remain unchanged (dual-read until Phase 3)

After Phase 2:
- ✅ App code reads exclusively from school_teams
- ✅ cohort_members stays in sync with school_teams cohort
- ✅ Backward compat: if school_team_id is null, app handles gracefully

After Phase 3:
- ✅ cohort.school_id removed (legacy dropped)
- ✅ Source of truth: (profiles.school_team_id → school_teams → school_id + cohort_id)

---

## Testing Checklist

Before approving Phase 1:
- [ ] Database is backed up
- [ ] Migration script syntax verified
- [ ] Rollback script syntax verified
- [ ] Backfill logic reviewed (empty DB case)

Before deploying Phase 2:
- [ ] All code changes reviewed
- [ ] Unit tests updated
- [ ] Staging environment tested
- [ ] No regressions in schools/teams UI

Before deploying Phase 3:
- [ ] Phase 2 stable in production for 1 week
- [ ] No alerts or errors in logs
- [ ] Grep confirms no cohort.school_id reads in code

---

## Approval Request

Please review and approve:
1. ✅ Phase 1 SQL (create table, backfill, add FK)
2. ✅ Phase 1 rollback (safe to undo)
3. ✅ Phase 2 strategy (code changes, fallback reads)
4. ✅ Phase 3 cleanup (optional removal)

**Next steps after approval:**
- Phase 1: Execute migration script (no code changes needed)
- Phase 2: Implement code changes (separate PR)
- Phase 3: Cleanup (after verification)
