#!/usr/bin/env node
/**
 * Audit script for Schools & Teams data model
 * Reports on current state before proposing schema migration
 * RUN: node --env-file-if-exists=/vercel/share/.env.project scripts/audit_school_teams_model.js
 */

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function auditData() {
  console.log("\n=== SCHOOL TEAMS MODEL AUDIT ===\n");

  // 1. Get all cohorts
  console.log("1. ALL COHORTS");
  console.log("==============");
  const { data: cohorts, error: cohortErr } = await supabase
    .from("cohorts")
    .select("id, name, current_year, school_id");

  if (cohortErr) {
    console.log("Could not fetch cohorts:", cohortErr.message);
  } else {
    console.log(`Total cohorts: ${cohorts.length}`);
    if (cohorts.length > 0) {
      // Get school names
      const schoolIds = [...new Set(cohorts.map((c) => c.school_id).filter(Boolean))];
      const { data: schools } = await supabase
        .from("schools")
        .select("id, name")
        .in("id", schoolIds);

      const schoolMap = {};
      schools?.forEach((s) => {
        schoolMap[s.id] = s.name;
      });

      console.log("\nCohort details:");
      cohorts.forEach((c) => {
        const schoolName = c.school_id
          ? schoolMap[c.school_id] || `[Unknown: ${c.school_id.slice(0, 8)}]`
          : "(NULL)";
        console.log(
          `  - ${c.name} (ID: ${c.id.slice(0, 8)}) | Year: ${c.current_year} | School: ${schoolName}`
        );
      });
    }
  }

  // 2. Get cohort_members count and distribution
  console.log("\n2. COHORT_MEMBERS COUNTS");
  console.log("========================");
  const { data: allMembers, error: memberErr } = await supabase
    .from("cohort_members")
    .select("cohort_id");

  if (memberErr) {
    console.log("Could not fetch cohort_members:", memberErr.message);
  } else {
    console.log(`Total members: ${allMembers.length}`);
    if (allMembers.length > 0) {
      // Get cohort names for the members
      const cohortIds = [...new Set(allMembers.map((m) => m.cohort_id))];
      const { data: cohortsForMembers } = await supabase
        .from("cohorts")
        .select("id, name")
        .in("id", cohortIds);

      const cohortMap = {};
      cohortsForMembers?.forEach((c) => {
        cohortMap[c.id] = c.name;
      });

      const countByName = {};
      allMembers.forEach((m) => {
        const name = cohortMap[m.cohort_id] || "(unknown)";
        countByName[name] = (countByName[name] || 0) + 1;
      });

      console.log("\nDistribution by cohort:");
      Object.entries(countByName)
        .sort(([, a], [, b]) => b - a)
        .forEach(([name, count]) => {
          console.log(`  - ${name}: ${count} members`);
        });
    }
  }

  // 3. Find profile.school_id mismatches with cohort.school_id
  console.log("\n3. PROFILE.SCHOOL_ID vs COHORT.SCHOOL_ID MISMATCHES");
  console.log("===================================================");
  const { data: profilesWithSchool, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, school_id, role")
    .neq("school_id", "NULL");

  if (profileErr) {
    console.log("Could not fetch profiles:", profileErr.message);
  } else if (!profilesWithSchool || profilesWithSchool.length === 0) {
    console.log("✓ No profiles with school_id (everyone has NULL)");
  } else {
    console.log(`Checking ${profilesWithSchool.length} profiles with school_id...`);
    let mismatches = [];

    for (const profile of profilesWithSchool) {
      const { data: cohortMembers } = await supabase
        .from("cohort_members")
        .select("cohort_id")
        .eq("profile_id", profile.id);

      if (cohortMembers?.length > 0) {
        for (const membership of cohortMembers) {
          const { data: cohort } = await supabase
            .from("cohorts")
            .select("school_id")
            .eq("id", membership.cohort_id)
            .single();

          if (cohort?.school_id && cohort.school_id !== profile.school_id) {
            mismatches.push({
              profile: profile.full_name,
              profile_school: profile.school_id.slice(0, 8),
              cohort_school: cohort.school_id.slice(0, 8),
            });
          }
        }
      }
    }

    if (mismatches.length === 0) {
      console.log(
        `✓ No mismatches found (all ${profilesWithSchool.length} profiles match their cohort's school_id)`
      );
    } else {
      console.log(`⚠️  Found ${mismatches.length} mismatches:`);
      mismatches.forEach((m) => {
        console.log(
          `  - ${m.profile}: profile.school=${m.profile_school} vs cohort.school=${m.cohort_school}`
        );
      });
    }
  }

  // 4. Check for fellows in multiple cohorts
  console.log("\n4. FELLOWS IN MULTIPLE COHORTS");
  console.log("===============================");
  const { data: allFellows } = await supabase
    .from("profiles")
    .select("id, full_name")
    .eq("role", "fellow");

  if (!allFellows || allFellows.length === 0) {
    console.log("No fellows found");
  } else {
    console.log(`Checking ${allFellows.length} fellows...`);
    let multiCohortList = [];

    for (const fellow of allFellows) {
      const { data: memberships } = await supabase
        .from("cohort_members")
        .select("cohort_id")
        .eq("profile_id", fellow.id);

      if (memberships && memberships.length > 1) {
        const cohortIds = memberships.map((m) => m.cohort_id);
        const { data: cohortNames } = await supabase
          .from("cohorts")
          .select("name")
          .in("id", cohortIds);

        const names = cohortNames?.map((c) => c.name).join(", ") || "(unknown)";
        multiCohortList.push({
          fellow: fellow.full_name,
          cohorts: names,
          count: memberships.length,
        });
      }
    }

    if (multiCohortList.length === 0) {
      console.log(`✓ No fellows in multiple cohorts (${allFellows.length} total fellows, all in 0 or 1)`);
    } else {
      console.log(`⚠️  Found ${multiCohortList.length} fellows in multiple cohorts:`);
      multiCohortList.forEach((f) => {
        console.log(`  - ${f.fellow}: ${f.cohorts}`);
      });
    }
  }

  // 5. List all schools
  console.log("\n5. ALL SCHOOLS");
  console.log("==============");
  const { data: schoolsAll, error: schoolErr } = await supabase
    .from("schools")
    .select("id, name")
    .order("name");

  if (schoolErr) {
    console.log("Could not fetch schools:", schoolErr.message);
  } else {
    console.log(`Total schools: ${schoolsAll.length}`);
    if (schoolsAll.length > 0) {
      schoolsAll.forEach((s) => {
        console.log(`  - ${s.name} (${s.id.slice(0, 8)})`);
      });
    } else {
      console.log("(No schools in database)");
    }
  }

  // 6. Code references summary
  console.log("\n6. CODE REFERENCES TO COHORT.SCHOOL_ID");
  console.log("======================================");
  console.log(`
Key files that read/write cohort.school_id:
  - /app/admin/schools/page.tsx (line 48, 68, 70): Queries cohort.school_id to group by school
  - /app/admin/schools/actions.ts (line 202, 220): Sets profile.school_id = cohort.school_id
  - /lib/team-extras.ts (line 11): Comment notes intentional use of school_id
  - /lib/auth-server.ts (line 71, 102, 173): Selects profile.school_id, school metadata

Profile.school_id is used as:
  - (auth-server.ts line 37): Set as 'schoolTeamId' in session user object
  - (schools/actions.ts line 202): Matched to cohort.school_id to ensure consistency
`);

  console.log("=== END AUDIT ===\n");
  process.exit(0);
}

auditData().catch((err) => {
  console.error("Audit failed:", err.message);
  process.exit(1);
});
