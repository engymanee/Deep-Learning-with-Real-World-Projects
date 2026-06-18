# Migration Rollback Procedures

## Quick Reference

| Phase | If Problems | Rollback Time | Data Loss |
|-------|-------------|---------------|-----------|
| **Phase 1** | After migrate but before code deploy | ~1 min | None |
| **Phase 2** | After code deploy but within 24h | ~1 min (code) | None |
| **Phase 3** | After dropping cohort.school_id | ~5 min (restore & backfill) | None |

---

## Phase 1 Rollback (SQL Only)

### When to Use

- After running Phase 1 migration but BEFORE Phase 2 code deploy
- If backfill verification shows errors
- If unexpected data integrity issues found

### Procedure

```sql
-- Phase 1 Rollback Script
-- ======================
-- Time: ~1 minute
-- Data loss: None (no data existed to migrate)

BEGIN;

-- Step 1: Verify we're in the right state
SELECT 
  (SELECT COUNT(*) FROM public.school_teams) as school_teams_count,
  (SELECT COUNT(*) FROM public.profiles WHERE school_team_id IS NOT NULL) as profiles_with_team_id;

-- Step 2: Drop school_team_id column from profiles
ALTER TABLE public.profiles
  DROP COLUMN school_team_id CASCADE;

-- Step 3: Drop school_teams table
DROP TABLE public.school_teams CASCADE;

-- Step 4: Verify rollback
SELECT COUNT(*) FROM public.cohorts;  -- Should still exist
SELECT COUNT(*) FROM public.profiles; -- Should still exist (no school_team_id)

COMMIT;
```

### Verification After Rollback

```bash
# Run this query to confirm state:
psql -c "
  SELECT 
    'cohorts' as table_name, COUNT(*) as row_count FROM public.cohorts
  UNION ALL
  SELECT 
    'school_teams', COUNT(*) FROM public.school_teams
  UNION ALL
  SELECT 
    'profiles', COUNT(*) FROM public.profiles;
"

# Expected:
# cohorts    | (original count)
# school_teams | 0 (table doesn't exist yet in query)
# profiles   | (original count)
```

---

## Phase 2 Rollback (Code Only)

### When to Use

- After deploying Phase 2 code but finding regressions
- If schools UI broken or user queries failing
- Within first 24 hours of Phase 2 deploy

### Procedure

```bash
# Step 1: Identify the last good commit before Phase 2
git log --oneline | head -20
# Find the commit that says "Phase 2: Code changes"

# Step 2: Revert Phase 2 commit
git revert <commit-hash-of-phase2> --no-edit

# Step 3: Push to production (or staging)
git push origin main

# Step 4: Restart app services
# (depends on your deployment system - Vercel auto-deploys, or run restart command)

# Step 5: Monitor logs for errors
tail -f /var/log/app.log | grep error
# or check Vercel dashboard
```

### Data State After Rollback

- ✅ `school_teams` table still exists in database (from Phase 1)
- ✅ `profiles.school_team_id` column still exists (from Phase 1)
- ✅ All backfilled data still exists
- ✅ App reads from old `profile.school_id` + `cohort.school_id` only
- ✅ New invites use old code path (sets profile.school_id)

### Re-Deploy After Phase 2 Rollback

```bash
# After fixing the issues in code:
git commit -m "Fix: Phase 2 issues with school_teams queries"
git push origin main
# Redeploy when ready
```

---

## Phase 3 Rollback (Optional Cleanup)

### When to Use

- Only if Phase 3 (drop cohort.school_id) causes issues
- If you need to maintain backward compatibility longer

### Procedure

```sql
-- Phase 3 Rollback Script
-- =======================
-- Time: ~5 minutes (includes backfill)
-- Data loss: None

BEGIN;

-- Step 1: Restore cohort.school_id column
ALTER TABLE public.cohorts
  ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Step 2: Backfill cohort.school_id from school_teams
UPDATE public.cohorts c
SET school_id = st.school_id
FROM public.school_teams st
WHERE c.id = st.cohort_id;

-- Step 3: Create index on new column
CREATE INDEX idx_cohorts_school_id ON public.cohorts(school_id);

-- Step 4: Verify backfill
SELECT COUNT(*) as cohorts_with_school_id 
FROM public.cohorts 
WHERE school_id IS NOT NULL;

-- Step 5: Verify no nulls (if there were any original cohorts)
SELECT COUNT(*) as cohorts_missing_school_id 
FROM public.cohorts 
WHERE school_id IS NULL;

COMMIT;
```

### Verification After Rollback

```sql
-- Confirm restoration
SELECT 
  c.id,
  c.name,
  c.school_id,
  s.name as school_name
FROM public.cohorts c
LEFT JOIN public.schools s ON c.school_id = s.id
LIMIT 5;

-- Should show school_id and school_name populated
```

---

## Full Migration Rollback (Emergency)

### When to Use

- Catastrophic failure requiring complete migration reversal
- If data corruption detected
- If business decision to abandon school_teams model

### Procedure

```bash
# Step 1: Rollback code (Phase 2 rollback)
git revert <commit-hash-of-phase2> --no-edit
git push origin main

# Step 2: Restore cohort.school_id (Phase 3 rollback)
psql -f /scripts/rollback_phase3.sql

# Step 3: Drop school_teams infrastructure (Phase 1 rollback)
psql -f /scripts/rollback_phase1.sql

# Step 4: Verify all systems back to original state
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'cohorts'"
# Should show: school_id (present)

psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'profiles'"
# Should NOT show: school_team_id

# Step 5: Restart app
# (systemctl restart app / Vercel auto-deploy / docker restart)

# Step 6: Run smoke tests
# - Login as user
# - Access schools admin
# - List users
# - Check no 'school_team_id' errors in logs
```

### Files to Have Ready

Create these rollback scripts in advance:

**`/scripts/rollback_phase1.sql`:**
```sql
-- Drop school_team_id from profiles
ALTER TABLE public.profiles DROP COLUMN school_team_id;
-- Drop school_teams table
DROP TABLE public.school_teams;
```

**`/scripts/rollback_phase2_code.sh`:**
```bash
#!/bin/bash
git revert <latest-commit-hash> --no-edit
git push origin main
```

**`/scripts/rollback_phase3.sql`:**
```sql
-- Restore cohort.school_id
ALTER TABLE public.cohorts ADD COLUMN school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;
UPDATE public.cohorts c SET school_id = st.school_id FROM public.school_teams st WHERE c.id = st.cohort_id;
CREATE INDEX idx_cohorts_school_id ON public.cohorts(school_id);
```

---

## Monitoring During Migration

### Phase 1 Monitoring (SQL)

Run during migration to verify backfill progress:

```sql
-- Watch backfill progress every 10 seconds
SELECT 
  'school_teams' as table_name,
  COUNT(*) as row_count,
  MAX(created_at) as latest_created
FROM public.school_teams
UNION ALL
SELECT 
  'profiles with school_team_id',
  COUNT(*) as row_count,
  MAX(updated_at) as latest_updated
FROM public.profiles
WHERE school_team_id IS NOT NULL;
```

### Phase 2 Monitoring (Logs)

Watch for errors after code deploy:

```bash
# Watch for errors in real-time
tail -f app.log | grep -E "error|Error|ERROR|school_team"

# Search for specific errors
grep "school_team" app.log | grep -i "null\|undefined\|not found"

# Check query performance
grep "school_teams" app.log | grep "ms" | sort -t':' -k2 -n | tail -10
```

### Phase 3 Monitoring (Data)

Check for orphaned records after cleanup:

```sql
-- Verify no orphaned school_teams (their cohorts should exist)
SELECT st.id, st.cohort_id
FROM public.school_teams st
WHERE st.cohort_id NOT IN (SELECT id FROM public.cohorts);

-- Verify no profiles point to deleted teams
SELECT p.id, p.school_team_id
FROM public.profiles p
WHERE p.school_team_id NOT IN (SELECT id FROM public.school_teams)
  AND p.school_team_id IS NOT NULL;
```

---

## Prevention Checklist

Before deploying each phase:

- [ ] Database backed up (Supabase auto-backup, or manual backup taken)
- [ ] Rollback scripts tested in staging
- [ ] Monitoring/alerting configured for logs
- [ ] Team notified of maintenance window (if any)
- [ ] Rollback runbook shared with on-call team
- [ ] Estimated rollback time calculated (Phase 1: 1m, Phase 2: 1m, Phase 3: 5m)
- [ ] Deployment windows outside peak hours if possible

---

## Post-Rollback Actions

After any rollback:

1. **Investigate root cause**
   - Review logs for specific error messages
   - Check data integrity in rolled-back state
   - Identify what code/queries caused issue

2. **Fix the issue**
   - Create fix in local branch
   - Test in staging
   - Code review again
   - Plan re-deployment

3. **Re-attempt migration**
   - Deploy fix
   - Monitor closely
   - Follow original migration plan with fixes applied

4. **Document lessons learned**
   - Add to runbook what went wrong
   - Update monitoring to catch issue earlier next time
   - Update code/tests to prevent regression

---

## Contact & Escalation

| Issue | Owner | Response Time |
|-------|-------|----------------|
| Phase 1 SQL failure | Database admin | 15 min |
| Phase 2 code regression | Backend lead | 30 min |
| Phase 3 data corruption | Database admin | ASAP |
| Production downtime | On-call engineer | 5 min |

---

## Summary

All three phases are designed to be **rolled back safely with no data loss**. The key strategy:

1. **Phase 1** stays in database permanently (new columns don't hurt if unused)
2. **Phase 2** code is easily reverted (git revert)
3. **Phase 3** cleanup is optional (can stay deployed for weeks before removing old column)

**Time to recover from any phase:** < 5 minutes, < 1 minute for Phase 1 and Phase 2
