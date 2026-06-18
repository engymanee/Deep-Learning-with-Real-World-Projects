# Phase 1 Execution Guide

## Status: READY FOR EXECUTION

**Migration Script:** `scripts/057_school_teams_migration_phase1.sql`

---

## How to Execute Phase 1

### Option 1: Supabase Dashboard (Recommended)

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Navigate to **SQL Editor**
4. Create a **New Query**
5. Copy the entire content from `scripts/057_school_teams_migration_phase1.sql`
6. Paste into the SQL editor
7. Click **Run**
8. Verify results in the NOTICE messages

**Time:** ~30 seconds
**Rollback:** < 1 minute (see below)

---

### Option 2: Command Line (if psql is available)

```bash
cd /vercel/share/v0-project
psql "$POSTGRES_URL" -f scripts/057_school_teams_migration_phase1.sql
```

---

## What the Migration Does

### 1. Creates `school_teams` Table
```sql
CREATE TABLE school_teams (
  id uuid PRIMARY KEY,
  school_id uuid FK → schools,
  cohort_id uuid FK → cohorts,
  name text,
  UNIQUE(school_id, cohort_id)  -- No duplicates
)
```

**Why:** Represents the (school × cohort) pair as a single entity.

### 2. Adds `school_team_id` to Profiles
```sql
ALTER TABLE profiles ADD COLUMN school_team_id uuid FK → school_teams
```

**Why:** Fellows link to teams via this column (replaces `profiles.school_id` for team lookup).

### 3. Backfills school_teams
For each cohort with a `school_id`, creates one `school_teams` row.

**Example:**
- If School "AAI" has Cohort A (current_year=1), creates:
  - `school_teams: {id: uuid, school_id: aai-id, cohort_id: cohort-a-id, name: "AAI - Cohort A"}`

### 4. Backfills profiles.school_team_id
For each fellow in `cohort_members`, finds their `school_teams` via cohort_id and sets it.

---

## Pre-Execution Checklist

- [ ] Read this guide completely
- [ ] Review the migration SQL: `scripts/057_school_teams_migration_phase1.sql`
- [ ] Backup database (Supabase auto-backups daily; request manual backup if concerned)
- [ ] Schedule execution during low-traffic time (optional)
- [ ] Have the rollback script ready

---

## Post-Execution Verification

After running the migration, verify success:

### In Supabase SQL Editor:

**Check 1: school_teams table created**
```sql
SELECT COUNT(*) as school_teams_count FROM school_teams;
```
Expected: 0 (database is empty) or number of cohorts with school_id

**Check 2: Profiles column added**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name='profiles' AND column_name='school_team_id';
```
Expected: One row with "school_team_id"

**Check 3: Indexes created**
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('school_teams', 'profiles') 
AND indexname LIKE 'idx_%';
```
Expected: 3 rows (idx_school_teams_school_id, idx_school_teams_cohort_id, idx_profiles_school_team_id)

---

## Rollback (if needed)

If something goes wrong, rollback using this script:

**Time:** < 1 minute

**Script:**
```sql
BEGIN;
ALTER TABLE public.profiles DROP COLUMN school_team_id;
DROP TABLE public.school_teams;
COMMIT;
```

**Steps:**
1. Go to Supabase SQL Editor
2. Create a new query
3. Paste the rollback script above
4. Click **Run**
5. App returns to pre-Phase-1 state (all changes undone)

---

## What's Next

After Phase 1 executes successfully:

1. **Monitor:** Watch logs for 1 week (no code changes yet)
2. **Verify:** Run post-execution checks above weekly
3. **Phase 2:** After 1 week, proceed to Phase 2 (code changes)

---

## Troubleshooting

### Error: "relation 'school_teams' already exists"
- Migration has already run
- Safe to re-run (uses `IF NOT EXISTS` and `ON CONFLICT`)
- Proceed to Phase 2

### Error: "column 'school_team_id' of relation 'profiles' already exists"
- Migration has already run
- Safe to proceed
- Check backfill: Run "Check 3" verification above

### Error: "permission denied"
- Service role key may be invalid
- Verify `SUPABASE_SERVICE_ROLE_KEY` in environment
- Contact Supabase support

### Migration hangs
- Normal for large databases (can take 5-10 min for 100k+ rows)
- Do NOT interrupt
- Wait for completion

---

## Need Help?

- Review: `MIGRATION_PROPOSAL.md` (detailed SQL explanation)
- Ask: Questions before executing
- Rollback: Easy if issues arise (< 1 min)
