/**
 * Shared definition of the high-level Cohort enum (A / B / C).
 *
 * Note: this is **not** the same concept as the `cohorts` table in
 * the database. Historically that table represented program "cohorts"
 * but in the product it is now surfaced as "School Team" - a grouping
 * of staff from one school. The `Cohort` here is a coarser, all-program
 * label used to gate phases / items / library resources to subsets of
 * fellows. See migration 019_cohort_gating.sql.
 */

export const COHORTS = ['A', 'B', 'C'] as const

export type Cohort = (typeof COHORTS)[number]

export function isCohort(value: unknown): value is Cohort {
  return typeof value === 'string' && (COHORTS as readonly string[]).includes(value)
}

/**
 * Returns true if a fellow with `userCohort` should be allowed to see
 * content gated by `targetCohorts`. Strict assigned-only access:
 *
 *  - empty `targetCohorts` array  -> NOT visible to any fellow
 *                                    (curriculum is not assigned to
 *                                    anyone yet)
 *  - non-empty                   -> only fellows whose cohort is listed
 *  - fellow with no cohort set   -> can never see gated content;
 *                                    they must be assigned a cohort
 *                                    first
 *
 * Admins / facilitators bypass this check at the call site (they always
 * see everything regardless of cohort and never carry a cohort value).
 */
export function fellowCanAccess(
  targetCohorts: readonly string[] | null | undefined,
  userCohort: Cohort | null | undefined,
): boolean {
  if (!targetCohorts || targetCohorts.length === 0) return false
  if (!userCohort) return false
  return targetCohorts.includes(userCohort)
}
