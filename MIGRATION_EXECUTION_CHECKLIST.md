# School Teams Migration - Execution Checklist

## Pre-Migration Verification

- [ ] Database backed up (Supabase auto-backup verified or manual backup taken)
- [ ] Current state audited (0 schools, 0 cohorts, 0 members confirmed)
- [ ] All proposal documents reviewed and approved
- [ ] Team notified of migration plan
- [ ] Rollback procedures shared with on-call team
- [ ] Monitoring alerts configured

---

## Phase 1: Create & Backfill (SQL Only)

### Pre-Execution

- [ ] Read: MIGRATION_PROPOSAL.md (Phase 1 section)
- [ ] Review: Phase 1 SQL migration script (has rollback)
- [ ] Test in staging: Run migration on staging DB
- [ ] Confirm: No schema conflicts or naming collisions
- [ ] Backup: Take final backup before executing

### Execution

```bash
# Step 1: Connect to production database
# (Use Supabase dashboard or psql with credentials)

# Step 2: Copy Phase 1 migration script from MIGRATION_PROPOSAL.md
# (Section: "Phase 1 SQL Migration")

# Step 3: Execute migration
psql production_db < phase1_migration.sql

# Step 4: Verify success
psql production_db -c "SELECT COUNT(*) FROM school_teams;"
# Expected: 0 (DB is empty)

psql production_db -c "SELECT column_name FROM information_schema.columns 
                       WHERE table_name = 'profiles' AND column_name = 'school_team_id';"
# Expected: school_team_id (column exists)
```

### Post-Execution Verification

- [ ] `school_teams` table exists (check Supabase dashboard)
- [ ] `profiles.school_team_id` column exists
- [ ] Indexes created (idx_school_teams_school_id, etc.)
- [ ] Backfill count matches expectations (0 for empty DB)
- [ ] No errors in application logs
- [ ] Old columns still exist (cohort.school_id, profile.school_id)

### Verification Queries

```sql
-- Verify table structure
\d public.school_teams

-- Expected output:
--    Column   |   Type   |                 Modifiers
--   ---------+----------+-------------------------------------------
--    id      | uuid     | not null default gen_random_uuid()
--    school_id | uuid   | not null
--    cohort_id | uuid   | not null
--    name    | text     | not null
--    created_at | timestamptz | default now()

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'school_teams';
-- Expected: idx_school_teams_school_id, idx_school_teams_cohort_id

-- Verify profiles column
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'school_team_id';
-- Expected: school_team_id | uuid

-- Verify old columns still exist
SELECT column_name FROM information_schema.columns 
WHERE table_name IN ('cohorts', 'profiles') 
AND column_name IN ('school_id')
ORDER BY table_name, column_name;
-- Expected: cohorts.school_id, profiles.school_id (both present)
```

### Success Criteria

✅ Phase 1 complete when:
- `school_teams` table created
- `profiles.school_team_id` column added
- All indexes created
- Zero errors in migration
- Old columns still present
- Ready for Phase 2 (code changes)

### If Rollback Needed

```bash
# Use Phase 1 Rollback from MIGRATION_ROLLBACK_PROCEDURES.md
psql production_db < phase1_rollback.sql

# Verify rollback
psql production_db -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables 
                                      WHERE table_name = 'school_teams');"
# Expected: f (false, table does not exist)
```

---

## Phase 2: Code Changes (App Update)

### Pre-Execution (After Phase 1 Stable for 1+ Week)

- [ ] Monitor production logs for 1 week (no errors related to school_teams)
- [ ] Confirm Phase 1 backfill queries run successfully
- [ ] Read: PHASE2_CODE_CHANGES.md (all 6 files)
- [ ] Review: Code changes in staging
- [ ] Run unit tests in staging
- [ ] Run integration tests in staging
- [ ] Get code review approval from backend lead

### Code Changes Implementation

**Files to update (in order):**

1. `/lib/auth-server.ts`
   - [ ] Update getCurrentUser() to read school_teams
   - [ ] Add schoolId and cohortId to session object
   - [ ] Test: Login and verify session contains all three IDs

2. `/lib/team-extras.ts`
   - [ ] Update getSchoolTeamLeadership() to use school_teams join
   - [ ] Test: Query returns correct leadership

3. `/lib/invitations/invite.ts`
   - [ ] Update applyProfileEnrichment() to set school_team_id
   - [ ] Resolve cohort_id from school_teams
   - [ ] Test: Invite flow creates correct cohort_members row

4. `/app/admin/users/actions.ts`
   - [ ] Update inviteUserAction() to pass school_team_id
   - [ ] Update addMemberAction() to validate via school_teams
   - [ ] Test: Adding member works and sets school_team_id

5. `/app/admin/schools/page.tsx`
   - [ ] Update queries to read school_teams instead of cohorts
   - [ ] Update grouping logic
   - [ ] Update UI rendering
   - [ ] Test: Schools page displays teams correctly

6. `/app/admin/users/page.tsx`
   - [ ] Update queries to read school_team_id from profiles
   - [ ] Update display to show team name
   - [ ] Test: User list shows correct teams

### Testing Before Deploy

```bash
# Unit tests
npm test -- auth-server.test.ts
npm test -- team-extras.test.ts
npm test -- invite.test.ts

# Integration tests
npm test -- admin/schools.integration.ts
npm test -- admin/users.integration.ts

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint
```

### Deployment

```bash
# Create feature branch
git checkout -b phase2-school-teams-code

# Commit code changes
git add app/ lib/
git commit -m "feat: switch from cohort.school_id to school_teams

- Update auth-server to resolve school_id + cohort_id from school_teams
- Update schools admin to query school_teams instead of cohorts
- Update user admin to read school_team_id from profiles
- Update invite flow to set school_team_id and resolve cohort
- Update team-extras helpers to use school_teams joins
- Add fallback logic for backward compatibility"

# Push and create PR
git push origin phase2-school-teams-code

# After PR review and approval:
git checkout main
git merge phase2-school-teams-code

# Deploy to production
git push origin main
# (Auto-deploy via Vercel or manual deploy)
```

### Post-Deploy Verification

- [ ] App deployed successfully
- [ ] No errors in logs (filter for "school_team")
- [ ] Login works (session has schoolTeamId, schoolId, cohortId)
- [ ] Schools admin page loads (teams list displays)
- [ ] User admin page loads (teams column shows)
- [ ] New invite flow works (can invite fellow to team)
- [ ] Can add member to team (triggers cohort_members insert)

### Verification Queries

```sql
-- Sample queries to verify Phase 2 code is working

-- 1. Verify profiles have school_team_id set
SELECT COUNT(*) as profiles_with_team_id 
FROM public.profiles 
WHERE school_team_id IS NOT NULL;
-- Expected: > 0 (if any fellows invited during Phase 2)

-- 2. Verify cohort_members rows exist
SELECT COUNT(*) as cohort_members_count 
FROM public.cohort_members;
-- Expected: matches profiles with school_team_id

-- 3. Verify school_teams resolve correctly
SELECT p.id, st.name, st.school_id, st.cohort_id
FROM profiles p
LEFT JOIN school_teams st ON p.school_team_id = st.id
LIMIT 10;
-- Expected: All rows have cohort_id populated
```

### Success Criteria

✅ Phase 2 complete when:
- All 6 files updated with school_teams reads
- Code builds and passes tests
- App deployed to production
- Schools admin page works
- User admin page works
- Invites set school_team_id correctly
- Zero errors in production logs
- Fallback logic in place (can still read old columns if needed)

### If Rollback Needed

```bash
# Revert Phase 2 code commit
git revert <phase2-commit-hash> --no-edit

# Push reverted code
git push origin main

# Verify app comes back up on old code
# (No database changes, just code rollback)

# App will read from profile.school_id again (fallback)
# school_teams table still exists but unused
```

---

## Phase 3: Cleanup (Optional, After 4+ Weeks)

### Pre-Execution (After Phase 2 Stable for 4+ Weeks)

- [ ] Monitor production logs for 4+ weeks (zero errors related to old columns)
- [ ] Confirm no code reads cohort.school_id
- [ ] Search codebase: `grep -r "cohort\.school_id" app/ lib/`
  - Expected: 0 results
- [ ] Read: MIGRATION_PROPOSAL.md (Phase 3 section)
- [ ] Get DBA approval for column drop

### Execution

```bash
# Step 1: Create Phase 3 cleanup script (from MIGRATION_PROPOSAL.md)

# Step 2: Test in staging
psql staging_db < phase3_cleanup.sql

# Step 3: Back up production
# (Final backup before dropping old column)

# Step 4: Execute cleanup
psql production_db < phase3_cleanup.sql

# Step 5: Verify
psql production_db -c "SELECT column_name FROM information_schema.columns 
                       WHERE table_name = 'cohorts' AND column_name = 'school_id';"
# Expected: (0 rows) - column should not exist
```

### Verification

```sql
-- Confirm column was dropped
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'cohorts' AND column_name = 'school_id';
-- Expected: (0 rows)

-- Confirm FK constraints updated
\d public.school_teams
-- Verify cohort_id FK still references valid cohorts

-- Check for orphaned records
SELECT st.id FROM school_teams st
WHERE st.cohort_id NOT IN (SELECT id FROM cohorts);
-- Expected: (0 rows)
```

### Success Criteria

✅ Phase 3 complete when:
- `cohort.school_id` column dropped
- No code errors after dropping
- Referential integrity maintained
- All references to old column removed from codebase
- Production stable for 24 hours after cleanup

### If Rollback Needed

```bash
# Use Phase 3 Rollback from MIGRATION_ROLLBACK_PROCEDURES.md
psql production_db < phase3_rollback.sql

# Verify restoration
psql production_db -c "SELECT column_name FROM information_schema.columns 
                       WHERE table_name = 'cohorts' AND column_name = 'school_id';"
# Expected: school_id (column restored)
```

---

## Monitoring Throughout

### Phase 1 Monitoring (During migration)

```bash
# Watch for errors
tail -f /var/log/app.log | grep -i "error\|migration\|school_team"

# Monitor duration
time psql production_db < phase1_migration.sql
# Expected: < 1 minute

# Check table size growth
psql production_db -c "SELECT pg_size_pretty(pg_total_relation_size('school_teams'));"
# Expected: minimal size (empty DB)
```

### Phase 2 Monitoring (After code deploy)

```bash
# Real-time error monitoring
tail -f /var/log/app.log | grep -E "error|Error|ERROR|school_team" | grep -v "fallback"

# Count successful invites with school_team_id
psql production_db -c "SELECT COUNT(*) FROM profiles WHERE school_team_id IS NOT NULL AND role = 'fellow';"

# Check for query timeouts
psql production_db -c "SELECT query, mean_time FROM pg_stat_statements WHERE query LIKE '%school_teams%' ORDER BY mean_time DESC LIMIT 10;"
```

### Phase 3 Monitoring (After cleanup)

```bash
# Confirm no errors from missing column
tail -f /var/log/app.log | grep "school_id"

# Verify data consistency
psql production_db -c "SELECT COUNT(*) FROM school_teams WHERE school_id IS NULL OR cohort_id IS NULL;"
# Expected: 0
```

---

## Rollback Decision Matrix

| Symptom | Phase Affected | Rollback Action | Time |
|---------|----------------|-----------------|------|
| Migration syntax error | 1 | Run phase1_rollback.sql | 1 min |
| school_teams table corrupted | 1 | Run phase1_rollback.sql | 1 min |
| Schools admin broken after deploy | 2 | git revert + push | 1 min |
| Invites failing after deploy | 2 | git revert + push | 1 min |
| Orphaned school_teams after cleanup | 3 | Run phase3_rollback.sql | 5 min |
| Mass data corruption | Any | Contact DBA, restore from backup | 30 min |

---

## Sign-Off

### Phase 1 Sign-Off

Executed by: ___________________  
Date: ___________________  
Status: ☐ Success ☐ Rollback ☐ Partial  
Notes: _________________________________________________

### Phase 2 Sign-Off

Executed by: ___________________  
Date: ___________________  
Status: ☐ Success ☐ Rollback ☐ Partial  
Notes: _________________________________________________

### Phase 3 Sign-Off

Executed by: ___________________  
Date: ___________________  
Status: ☐ Success ☐ Rollback ☐ Deferred  
Notes: _________________________________________________

---

## Post-Migration Verification

After all phases complete:

- [ ] Schools can have multiple teams (create 2 schools with same cohort)
- [ ] Fellows can be invited to specific teams
- [ ] Curriculum access works (fellows see correct labs/modules for their cohort)
- [ ] Team reports show correct school + cohort combination
- [ ] No schema debt remaining
- [ ] Future feature: Teams spanning schools is now possible

---

**Next:** Read [MIGRATION_APPROVAL_REQUEST.md](MIGRATION_APPROVAL_REQUEST.md) for final approval
