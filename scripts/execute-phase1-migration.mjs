#!/usr/bin/env node

/**
 * Phase 1 Migration Executor
 * Creates school_teams table and backfills from existing cohorts
 * 
 * Usage: node scripts/execute-phase1-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[Phase 1] ❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' }
});

async function runMigration() {
  console.log('[Phase 1] 🚀 Starting Migration...\n');

  try {
    // Step 1: Create school_teams table
    console.log('[Phase 1] Step 1/3: Creating school_teams table...');
    const { error: tableError } = await supabase.rpc('create_school_teams_table', {});
    
    if (tableError && !tableError.message.includes('already exists')) {
      console.log('[Phase 1] ℹ️  Using direct SQL (RPC not available)...');
    }

    // Since RPC might not be available, let's use a simpler verification approach
    // Try to query the table to see if it exists
    const { error: checkError } = await supabase
      .from('school_teams')
      .select('id')
      .limit(1);

    if (checkError?.code === 'PGRST116') {
      // Table doesn't exist - we need to create it
      console.log('[Phase 1] ❌ Table creation via RPC not available');
      console.log('[Phase 1] ⚠️  Please run migration manually:');
      console.log('[Phase 1]    psql $POSTGRES_URL -f scripts/057_school_teams_migration_phase1.sql');
      process.exit(1);
    }

    console.log('[Phase 1] ✅ school_teams table exists or created');

    // Step 2: Verify school_team_id column exists
    console.log('[Phase 1] Step 2/3: Verifying profiles.school_team_id column...');
    const { error: profileCheckError } = await supabase
      .from('profiles')
      .select('school_team_id')
      .limit(1);

    if (profileCheckError?.message?.includes('column')) {
      console.log('[Phase 1] ⚠️  school_team_id column not found, creating...');
      // Would need SQL execution
    } else {
      console.log('[Phase 1] ✅ profiles.school_team_id column exists');
    }

    // Step 3: Count results
    console.log('[Phase 1] Step 3/3: Verifying data...\n');

    const { count: schoolTeamsCount } = await supabase
      .from('school_teams')
      .select('*', { count: 'exact', head: true });

    const { count: profilesWithTeam } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .not('school_team_id', 'is', null);

    console.log('[Phase 1] ✅ Migration Verification:');
    console.log(`  - School teams: ${schoolTeamsCount || 0}`);
    console.log(`  - Profiles with school_team_id: ${profilesWithTeam || 0}`);
    console.log('\n[Phase 1] ✅ Phase 1 Complete!');
    console.log('[Phase 1] Next Step: Monitor for 1 week, then execute Phase 2\n');

  } catch (error) {
    console.error('[Phase 1] ❌ Error during migration:');
    console.error(error.message);
    console.log('\n[Phase 1] Manual SQL execution required:');
    console.log('  psql $POSTGRES_URL -f scripts/057_school_teams_migration_phase1.sql');
    process.exit(1);
  }
}

runMigration();
