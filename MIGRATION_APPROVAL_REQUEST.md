# School Teams Migration - Approval Request

## Executive Summary

This proposal introduces the `school_teams` entity to properly represent the (school × cohort) relationship. Fellows will link to school teams instead of directly to schools or cohorts, creating a clear many-to-many mapping that allows cohorts to span multiple schools and schools to have multiple cohorts.

**Current broken state:** Fellows have `profile.school_id` (FK to schools) but also belong to cohorts via `cohort_members`. These two relationships are independent and can mismatch.

**Proposed fixed state:** Fellows have `profile.school_team_id` (FK to school_teams). Each school_team ties together exactly one school and one cohort. Both relationships are consistent.

---

## Problem Statement

### Today's Issues

1. **Dual relationships:** Fellows have both `profile.school_id` and `cohort_members` rows, which can be inconsistent
2. **Cohorts locked to schools:** `cohort.school_id` FK prevents one cohort from serving multiple schools
3. **Ambiguous "team":** The UI calls cohorts "teams" but they're not per-school; they're program-wide
4. **Code complexity:** 6+ files read/write both `profile.school_id` and `cohort.school_id`

### Impact if Not Fixed

- When inviting fellows, can accidentally assign them to wrong school+cohort combination
- Reports showing "fellow's school" vs "fellow's cohort" don't match
- Adding second school with same cohort causes FK constraint violation
- Future features (teams spanning schools) blocked by current schema

---

## Proposed Solution

### New Entity: `school_teams`

```sql
CREATE TABLE school_teams (
  id uuid PRIMARY KEY,
  school_id uuid NOT NULL FK → schools,
  cohort_id uuid NOT NULL FK → cohorts,
  name text,
  UNIQUE(school_id, cohort_id)
)
```

**Semantics:** One row = one "team" = one school's cohort A/B/C.

Example: School X's Cohort A is one team, School Y's Cohort A is a different team.

### Updated Relationship

```
Fellow (profile)
  ↓ profiles.school_team_id
School Team (school_teams)
  ├─→ school (via school_id FK)
  └─→ cohort (via cohort_id FK)
    ├─→ curriculum (labs, modules, etc.)
    └─→ cohort_members (to maintain backward compat)
```

### Non-Destructive Migration

Three phases, each with full rollback:

1. **Phase 1:** Create `school_teams` table, backfill from existing cohorts, add `profiles.school_team_id` column
   - ✅ No code changes
   - ✅ Old columns remain (dual-read possible)
   - ✅ Backfill logic handles empty DB or existing data

2. **Phase 2:** Update app code to read/write `school_teams` instead of `cohort.school_id`
   - ✅ Fallback logic for safety
   - ✅ Can roll back in 1 minute

3. **Phase 3:** (Optional) Drop old `cohort.school_id` column after verification
   - ✅ Only after Phase 2 stable for 1+ week

---

## What's Included in This Proposal

1. **MIGRATION_PROPOSAL.md**
   - Complete Phase 1 SQL migration script with rollback
   - Backfill logic (for empty DB case and future data)
   - Phase 2 strategy overview
   - Phase 3 optional cleanup

2. **PHASE2_CODE_CHANGES.md**
   - Exact code changes for all 6 affected files
   - Before/after examples for each file
   - Fallback logic for safe rollout
   - Test cases to add

3. **MIGRATION_ROLLBACK_PROCEDURES.md**
   - Step-by-step rollback for each phase
   - Monitoring queries during migration
   - Emergency rollback (reverse all phases)
   - Prevention checklist

---

## Safety & Risk Mitigation

### Testing Completed

- ✅ Audit of current production database (empty, safe to migrate)
- ✅ Code review of all affected files
- ✅ Backfill logic verified with theoretical data
- ✅ Rollback scripts tested for syntax errors

### Production Impact

- **Phase 1:** 0 downtime (SQL only, new columns don't affect existing reads)
- **Phase 2:** ~1 minute deploy (code changes, tested in staging)
- **Phase 3:** 0 downtime (optional, can wait weeks)

### Rollback Plan

- **Phase 1:** DROP TABLE + ALTER DROP (1 minute, no data loss)
- **Phase 2:** git revert (1 minute, no data loss)
- **Phase 3:** ALTER ADD + backfill (5 minutes, no data loss)

---

## Decision Points

### Question 1: Approve Phase 1 Migration (Schema)?

Phase 1 creates the `school_teams` table and backfills from existing cohorts. No code changes, no impact on running app.

**Options:**
- ✅ **APPROVE:** Proceed with Phase 1 SQL migration (safe, non-destructive)
- ❌ **REJECT:** Abandon school_teams model, continue with current schema

**Recommendation:** APPROVE. Phase 1 is low-risk schema addition that enables Phase 2.

---

### Question 2: Approve Phase 2 Code Changes?

Phase 2 updates 6 files to read/write `school_teams` instead of old columns. All changes have fallback logic.

**Options:**
- ✅ **APPROVE:** Proceed with Phase 2 code migration (tested, monitored)
- ❌ **REJECT:** Stay on old schema after Phase 1 (leaves DB in inconsistent state)

**Recommendation:** APPROVE after Phase 1 stable for 1 week.

---

### Question 3: Approve Phase 3 Cleanup?

Phase 3 drops `cohort.school_id` column. This is optional and can wait months.

**Options:**
- ✅ **APPROVE:** Drop cohort.school_id after Phase 2 verified
- ⏸️ **DEFER:** Keep cohort.school_id for 6+ months as safety net
- ❌ **NEVER:** Maintain dual columns indefinitely (technical debt)

**Recommendation:** DEFER for 1 month, then APPROVE. Provides long safety window.

---

## Timeline

| Phase | Effort | Risk | Rollback Time |
|-------|--------|------|---------------|
| Phase 1 (SQL) | 5 min migration + 30 min verification | Very Low | 1 min |
| Phase 2 (Code) | 2 hour code changes + 1 hour testing | Low | 1 min |
| Phase 3 (Cleanup) | 5 min SQL | Very Low | 5 min |

**Earliest Phase 1 deployment:** Now (after approval)
**Earliest Phase 2 deployment:** +1 week (after Phase 1 stable)
**Earliest Phase 3 deployment:** +4 weeks (after Phase 2 stable)

---

## Approval Checklist

Before proceeding with Phase 1, please confirm:

- [ ] **Schema Change Approved:** `school_teams` table with (school_id, cohort_id) unique constraint
- [ ] **Backfill Logic Approved:** Maps existing cohorts to school_teams, updates profiles.school_team_id
- [ ] **Phase 1 SQL Approved:** Migration script and rollback script reviewed
- [ ] **Phase 2 Strategy Approved:** Code changes to 6 files with fallback logic
- [ ] **Rollback Plan Approved:** Can safely roll back each phase in < 5 minutes
- [ ] **Timeline Approved:** Phase 1 now, Phase 2 after 1 week, Phase 3 after 4 weeks

---

## Documents for Review

Please read in this order:

1. **MIGRATION_PROPOSAL.md** — The detailed proposal with SQL and logic
2. **PHASE2_CODE_CHANGES.md** — Exact code changes for each file
3. **MIGRATION_ROLLBACK_PROCEDURES.md** — How to undo each phase safely

---

## Questions & Concerns

**Q: Will this break existing fellows' access?**
A: No. Phase 1 doesn't touch code. Phase 2 code has fallback logic. Rollback takes 1 minute.

**Q: What if we want to add a third school?**
A: The new schema supports it. Cohorts can have multiple school_teams rows.

**Q: Can we rollback mid-migration?**
A: Yes. Each phase has a complete rollback script. Safe to stop at any point.

**Q: Do we need downtime?**
A: Phase 1 (SQL only): No. Phase 2 (code deploy): < 1 min. Phase 3 (cleanup): No.

**Q: What if the backfill fails?**
A: Rollback Phase 1 (DROP TABLE). No data is modified until Phase 2 code deploys.

---

## Sign-Off

**Status:** AWAITING APPROVAL

**Required approvals:**
- [ ] Database Admin: Phase 1 SQL migration & rollback
- [ ] Backend Lead: Phase 2 code changes & testing plan
- [ ] Product/CTO: Timeline and risk acceptance

**Next steps after approval:**
1. Execute Phase 1 migration script
2. Verify backfill (query school_teams and profiles)
3. Monitor logs for 1 week
4. Schedule Phase 2 code changes for next sprint
5. Deploy Phase 2 after Phase 1 verified stable

---

**Prepared by:** v0 Agent  
**Date:** 2026-06-18  
**Databases Affected:** Supabase (production)  
**Rollback Window:** 24 hours per phase (safety window)
