#!/usr/bin/env node

/**
 * Phase 1 Migration Executor
 * Creates school_teams table and backfills from existing cohorts
 * 
 * Usage: node scripts/execute-phase1-migration.js
 * 
 * Rollback: Use scripts/rollback-phase1-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get environment variables
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Phase 1] ❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Initialize Supabase client with service role (for admin access)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeMigration() {
  console.log('[Phase 1] 🚀 Starting migration...\n');

  try {
    // Step 1: Create school_teams table
    console.log('[Phase 1] Step 1/5: Creating school_teams table...');
    const { error: createTableError } = await supabase.rpc('execute_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.school_teams (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
          cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
          name text NOT NULL,
          created_at timestamptz DEFAULT now(),
          CONSTRAINT school_teams_unique_pair UNIQUE(school_id, cohort_id)
        );
      `
    });
    
    if (createTableError) {
      // Table might already exist - check if it's just that error
      if (!createTableError.message.includes('already exists')) {
        throw createTableError;
      }
      console.log('[Phase 1] ℹ️  school_teams table already exists');
    } else {
      console.log('[Phase 1] ✅ school_teams table created');
    }

    // Step 2: Create indexes
    console.log('[Phase 1] Step 2/5: Creating indexes...');
    await supabase.rpc('execute_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_school_teams_school_id ON public.school_teams(school_id);
        CREATE INDEX IF NOT EXISTS idx_school_teams_cohort_id ON public.school_teams(cohort_id);
      `
    });
    console.log('[Phase 1] ✅ Indexes created');

    // Step 3: Add school_team_id column to profiles
    console.log('[Phase 1] Step 3/5: Adding school_team_id to profiles...');
    await supabase.rpc('execute_sql', {
      sql: `
        ALTER TABLE public.profiles
          ADD COLUMN IF NOT EXISTS school_team_id uuid REFERENCES public.school_teams(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_profiles_school_team_id ON public.profiles(school_team_id);
      `
    });
    console.log('[Phase 1] ✅ school_team_id column added to profiles');

    // Step 4: Backfill school_teams from cohorts
    console.log('[Phase 1] Step 4/5: Backfilling school_teams from cohorts...');
    await supabase.rpc('execute_sql', {
      sql: `
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
      `
    });
    console.log('[Phase 1] ✅ school_teams backfilled');

    // Step 5: Backfill profiles.school_team_id
    console.log('[Phase 1] Step 5/5: Backfilling profiles.school_team_id...');
    await supabase.rpc('execute_sql', {
      sql: `
        UPDATE public.profiles p
        SET school_team_id = st.id
        FROM public.cohort_members cm
        JOIN public.school_teams st ON st.cohort_id = cm.cohort_id
        WHERE 
          p.id = cm.profile_id 
          AND p.role = 'fellow'
          AND p.school_team_id IS NULL;
      `
    });
    console.log('[Phase 1] ✅ profiles.school_team_id backfilled');

    // Verification queries
    console.log('[Phase 1] Step 5/5: Verifying migration...\n');

    const { data: schoolTeamsCount } = await supabase
      .from('school_teams')
      .select('id', { count: 'exact', head: true });

    const { data: profilesWithTeam } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .not('school_team_id', 'is', null);

    console.log('[Phase 1] ✅ Migration complete!\n');
    console.log('[Phase 1] Results:');
    console.log(`  - School teams created: ${schoolTeamsCount?.length || 0}`);
    console.log(`  - Profiles with school_team_id: ${profilesWithTeam?.length || 0}`);
    console.log('\n[Phase 1] ✅ Phase 1 migration successful!');
    console.log('[Phase 1] Next: Monitor for 1 week, then execute Phase 2\n');

  } catch (error) {
    console.error('[Phase 1] ❌ Migration failed:');
    console.error(error);
    process.exit(1);
  }
}

// Run migration
executeMigration();
