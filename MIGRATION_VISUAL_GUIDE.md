# School Teams Migration - Visual Guide

## Before & After Schema

### BEFORE (Current)

```
Profiles (Fellow)
  ├─ id
  ├─ school_id ────→ Schools
  └─ (cohort via cohort_members FK, separate)

Cohort Members (Bridge)
  ├─ profile_id ───→ Profiles
  └─ cohort_id  ───→ Cohorts

Cohorts
  ├─ id
  ├─ school_id ────→ Schools  (DUPLICATE RELATIONSHIP)
  └─ current_year (A/B/C)

Schools
  └─ id, name
```

**Problem:** Two ways to get from Fellow → School. Can mismatch.

---

### AFTER (Proposed)

```
Profiles (Fellow)
  ├─ id
  ├─ school_team_id ───→ School Teams
  └─ (cohort_members stays for backward compat)

School Teams (NEW)
  ├─ id
  ├─ school_id ────→ Schools
  ├─ cohort_id ────→ Cohorts
  └─ name: "School X - Cohort A"
  
Cohort Members (Bridge)
  ├─ profile_id ───→ Profiles
  └─ cohort_id  ───→ Cohorts (still validates membership)

Cohorts
  ├─ id
  ├─ school_id ────→ Schools  (KEPT for Phase 1-2, dropped Phase 3)
  └─ current_year (A/B/C)

Schools
  └─ id, name
```

**Benefit:** One path from Fellow → School. Via school_teams.

---

## Migration Timeline

```
Phase 1: CREATE TABLE (SQL Only)
┌─────────────────────────────────┐
│ • Create school_teams table     │
│ • Add profiles.school_team_id   │
│ • Backfill from cohorts         │
│ • Keep cohort.school_id         │
│ Rollback: DROP TABLE (1 min)    │
└─────────────────────────────────┘
         ↓ (1 week)
         
Phase 2: UPDATE CODE
┌─────────────────────────────────┐
│ • 6 files read school_teams     │
│ • Fallback to old columns       │
│ • No schema changes             │
│ Rollback: git revert (1 min)    │
└─────────────────────────────────┘
         ↓ (1 month)
         
Phase 3: DROP OLD (Cleanup)
┌─────────────────────────────────┐
│ • Drop cohort.school_id         │
│ • Update tests                  │
│ • No code changes               │
│ Rollback: ALTER ADD (5 min)     │
└─────────────────────────────────┘
```

---

## Backfill Example

### Scenario: Create School Teams from Existing Cohorts

**Initial state (after Phase 1 backfill):**

```
Cohorts table:
┌──────────┬──────────┬──────────┐
│ id       │ school_id│ year     │
├──────────┼──────────┼──────────┤
│ cohort-1 │ school-A │ 1 (Cohort A)
│ cohort-2 │ school-A │ 2 (Cohort B)
│ cohort-3 │ school-B │ 1 (Cohort A)
└──────────┴──────────┴──────────┘

Profiles (fellows):
┌──────────┬────────────────────┐
│ id       │ school_id          │
├──────────┼────────────────────┤
│ fellow-1 │ school-A           │
│ fellow-2 │ school-A           │
│ fellow-3 │ school-B           │
└──────────┴────────────────────┘

Cohort Members:
┌──────────┬──────────┐
│ profile_id│ cohort_id│
├──────────┼──────────┤
│ fellow-1 │ cohort-1 │
│ fellow-2 │ cohort-1 │
│ fellow-3 │ cohort-3 │
└──────────┴──────────┘
```

**After backfill (Phase 1 completes):**

```
School Teams table (CREATED):
┌────────┬──────────┬──────────┬───────────────────────┐
│ id     │ school_id│ cohort_id│ name                  │
├────────┼──────────┼──────────┼───────────────────────┤
│ team-1 │ school-A │ cohort-1 │ School A - Cohort A   │
│ team-2 │ school-A │ cohort-2 │ School A - Cohort B   │
│ team-3 │ school-B │ cohort-3 │ School B - Cohort A   │
└────────┴──────────┴──────────┴───────────────────────┘

Profiles (fellows) - UPDATED:
┌──────────┬────────────────────┬───────────────┐
│ id       │ school_id          │ school_team_id│
├──────────┼────────────────────┼───────────────┤
│ fellow-1 │ school-A (old)     │ team-1        │ ← NEW
│ fellow-2 │ school-A (old)     │ team-1        │ ← NEW
│ fellow-3 │ school-B (old)     │ team-3        │ ← NEW
└──────────┴────────────────────┴───────────────┘
```

**Key insight:** Each fellow now has direct FK to school_teams. Can resolve to both school AND cohort.

---

## Query Evolution

### Today (Phase 1)

```sql
-- Find all fellows in School A
SELECT p.* FROM profiles p
WHERE p.school_id = 'school-A';
```

### Phase 2 (After Code Changes)

```sql
-- Same query, but via school_teams
SELECT p.* FROM profiles p
JOIN school_teams st ON p.school_team_id = st.id
WHERE st.school_id = 'school-A';
```

### Phase 3 (After Cleanup)

```sql
-- Same query, cohort.school_id dropped
-- No change needed because we already changed in Phase 2
SELECT p.* FROM profiles p
JOIN school_teams st ON p.school_team_id = st.id
WHERE st.school_id = 'school-A';
```

---

## Rollback Decision Tree

```
Problem detected?
│
├─→ "School teams table broken"
│   └─→ Phase 1 Rollback (DROP TABLE)
│       └─→ Returns to: No school_teams, no school_team_id
│
├─→ "Code queries failing after deploy"
│   └─→ Phase 2 Rollback (git revert)
│       └─→ Returns to: Old code, but school_teams table still exists
│
└─→ "Orphaned cohort.school_id after cleanup"
    └─→ Phase 3 Rollback (ALTER ADD + backfill)
        └─→ Returns to: cohort.school_id restored with data
```

---

## Files Modified (Phase 2)

```
lib/
├─ auth-server.ts               ✏️ Resolve school_team → school_id + cohort_id
├─ team-extras.ts               ✏️ Read school_id via school_teams
└─ invitations/invite.ts        ✏️ Set school_team_id, resolve cohort_id

app/
├─ admin/
│  ├─ schools/
│  │  ├─ page.tsx               ✏️ Query school_teams instead of cohorts
│  │  └─ actions.ts             ✏️ Validate via school_teams
│  └─ users/
│     └─ page.tsx               ✏️ Read school_team_id instead of school_id
```

**Total files:** 6
**Lines changed:** ~80
**Test cases added:** ~12

---

## Safety Guarantees

### Phase 1
- ✅ No data modified (only new columns/tables created)
- ✅ Old queries still work (old columns untouched)
- ✅ Backfill is idempotent (can run multiple times safely)

### Phase 2
- ✅ Fallback logic for missing school_team_id
- ✅ Code tested in staging
- ✅ Gradual rollout: feature flag possible if needed
- ✅ Rollback is code only (1 git revert)

### Phase 3
- ✅ Only drops after Phase 2 stable 4+ weeks
- ✅ Rollback restores data (5 min backfill)
- ✅ Optional (can skip permanently if needed)

---

## Key Numbers

| Metric | Value |
|--------|-------|
| **New tables** | 1 (school_teams) |
| **New columns** | 1 (profiles.school_team_id) |
| **Deleted columns** | 1 (cohort.school_id, in Phase 3 only) |
| **Files modified** | 6 |
| **Lines of code changed** | ~80 |
| **Test cases added** | ~12 |
| **Database downtime** | 0 min (all phases) |
| **Code deploy time** | ~1 min (Phase 2) |
| **Rollback time** | < 5 min (any phase) |
| **Data loss risk** | 0% (no data deleted) |

---

## Success Criteria

After Phase 1:
- ✅ `school_teams` table exists with correct schema
- ✅ All cohorts mapped to school_teams rows
- ✅ All fellows in cohort_members have school_team_id set
- ✅ No errors in logs

After Phase 2:
- ✅ All queries use school_teams
- ✅ Schools UI works without errors
- ✅ User listings show teams correctly
- ✅ New invites set school_team_id
- ✅ No cohort.school_id reads in code

After Phase 3:
- ✅ cohort.school_id column dropped
- ✅ Tests pass without old column
- ✅ No migration code in production
- ✅ Clean schema for future features

---

## What to Watch

During Phase 1:
- Query duration (backfill should take < 30 seconds)
- No 404s on cohort or school lookups
- Profiles table size (should not change much)

During Phase 2:
- Error logs for "school_team_id not found"
- Query performance (should be same or better)
- Admin pages for regression (schools list, user list)

During Phase 3:
- Error logs for "school_id" missing column references
- Referential integrity (no orphaned records)
- No unexpected cascade deletes

---

## Questions?

| Topic | Document |
|-------|-----------|
| SQL migration details | MIGRATION_PROPOSAL.md |
| Code changes | PHASE2_CODE_CHANGES.md |
| How to rollback | MIGRATION_ROLLBACK_PROCEDURES.md |
| Approval checklist | MIGRATION_APPROVAL_REQUEST.md |
