-- Phase 1: Create school_teams table and add school_team_id to profiles
-- Migration Date: 2026-06-18
-- Purpose: Introduce school_teams as the authoritative (school × cohort) entity
-- Safety: Non-destructive; keeps cohort.school_id intact for Phase 2 fallback
-- Rollback: DROP TABLE school_teams; ALTER TABLE profiles DROP COLUMN school_team_id;

BEGIN;

-- Step 1: Create school_teams table
-- Represents the (school × cohort) pair; unique constraint prevents duplicates
CREATE TABLE IF NOT EXISTS public.school_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT school_teams_unique_pair UNIQUE(school_id, cohort_id)
);

-- Create indexes for fast lookups during Phase 2
CREATE INDEX IF NOT EXISTS idx_school_teams_school_id ON public.school_teams(school_id);
CREATE INDEX IF NOT EXISTS idx_school_teams_cohort_id ON public.school_teams(cohort_id);

-- Step 2: Add school_team_id FK to profiles
-- This column will be populated incrementally as fellows are added/updated
-- Starting NULL; Phase 2 code will populate it for existing fellows
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS school_team_id uuid REFERENCES public.school_teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_school_team_id ON public.profiles(school_team_id);

-- Step 3: Backfill school_teams from existing cohorts
-- For each cohort with a school_id, create a school_team entry
-- Name format: "School Name - Cohort A/B/C"
-- This handles the current empty DB and any future data
INSERT INTO public.school_teams (school_id, cohort_id, name, created_at)
SELECT 
  c.school_id,
  c.id AS cohort_id,
  CONCAT(
    COALESCE(s.name, 'Unknown School'),
    ' - Cohort ',
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
WHERE c.school_id IS NOT NULL
ON CONFLICT (school_id, cohort_id) DO NOTHING;

-- Step 4: Backfill profiles.school_team_id for existing fellows
-- Links fellows to their school_team based on cohort_members relationship
-- Only updates profiles with role = 'fellow' to avoid affecting other roles
UPDATE public.profiles p
SET school_team_id = st.id
FROM public.cohort_members cm
JOIN public.school_teams st ON st.cohort_id = cm.cohort_id
WHERE 
  p.id = cm.profile_id 
  AND p.role = 'fellow'
  AND p.school_team_id IS NULL;

-- Step 5: Verify backfill completed
-- Log counts for operator validation
DO $$
DECLARE
  school_teams_count INT;
  profiles_with_school_team_count INT;
BEGIN
  SELECT COUNT(*) INTO school_teams_count FROM public.school_teams;
  SELECT COUNT(*) INTO profiles_with_school_team_count FROM public.profiles WHERE school_team_id IS NOT NULL;
  
  RAISE NOTICE 'Phase 1 Migration Complete:';
  RAISE NOTICE '  - School teams created: %', school_teams_count;
  RAISE NOTICE '  - Profiles with school_team_id: %', profiles_with_school_team_count;
END $$;

COMMIT;
