import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, Users } from 'lucide-react'
import { AddSchoolForm } from './add-school-form'
import { AddTeamForm } from './add-team-form'
import { AddMemberForm } from './add-member-form'
import { RemoveMemberButton } from './remove-member-button'
import { TeamMenu } from './team-menu'
import { SchoolMenu } from './school-menu'

type SchoolRow = { id: string; name: string }
type CohortRow = {
  id: string
  school_id: string
  name: string
  current_year: number
}
type MemberRow = {
  cohort_id: string
  profile_id: string
  profiles: { id: string; full_name: string | null; title: string | null } | null
}
type FellowRow = {
  id: string
  full_name: string | null
  title: string | null
  school_id: string | null
}

function initialsFor(name: string | null): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export default async function AdminSchoolsPage() {
  const supabase = await createClient()

  const [{ data: schools }, { data: cohorts }, { data: members }, { data: fellows }] =
    await Promise.all([
      supabase.from('schools').select('id, name').order('name'),
      supabase.from('cohorts').select('id, school_id, name, current_year').order('name'),
      supabase
        .from('cohort_members')
        .select('cohort_id, profile_id, profiles:profiles(id, full_name, title)'),
      supabase
        .from('profiles')
        .select('id, full_name, title, school_id')
        .eq('role', 'fellow')
        .is('deactivated_at', null)
        .order('full_name', { ascending: true, nullsFirst: false }),
    ])

  const schoolList = (schools ?? []) as SchoolRow[]
  const cohortList = (cohorts ?? []) as CohortRow[]
  const memberList = (members ?? []) as MemberRow[]
  const fellowList = (fellows ?? []) as FellowRow[]

  // Index structures
  const cohortsBySchool = new Map<string, CohortRow[]>()
  for (const c of cohortList) {
    const arr = cohortsBySchool.get(c.school_id) ?? []
    arr.push(c)
    cohortsBySchool.set(c.school_id, arr)
  }

  const membersByCohort = new Map<string, MemberRow[]>()
  const assignedProfileIds = new Set<string>()
  for (const m of memberList) {
    const arr = membersByCohort.get(m.cohort_id) ?? []
    arr.push(m)
    membersByCohort.set(m.cohort_id, arr)
    assignedProfileIds.add(m.profile_id)
  }

  const membersBySchool = new Map<string, number>()
  for (const c of cohortList) {
    const count = (membersByCohort.get(c.id) ?? []).length
    membersBySchool.set(c.school_id, (membersBySchool.get(c.school_id) ?? 0) + count)
  }

  // Fellows available to add to a team: anyone not already in a cohort.
  const unassignedFellows = fellowList
    .filter((f) => !assignedProfileIds.has(f.id))
    .map((f) => ({
      id: f.id,
      label: f.full_name
        ? f.title
          ? `${f.full_name} · ${f.title}`
          : f.full_name
        : '(unnamed)',
    }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-foreground">Schools &amp; teams</h2>
          <p className="text-sm text-muted-foreground">
            {schoolList.length} school{schoolList.length === 1 ? '' : 's'} · {cohortList.length} team
            {cohortList.length === 1 ? '' : 's'} · Each school can have one or more
            leadership teams moving through the program.
          </p>
        </div>
        <AddSchoolForm />
      </div>

      {schoolList.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-10 text-center">
            <Building2 className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No schools yet. Add one to start grouping fellows into leadership teams.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-5">
          {schoolList.map((school) => {
            const cohortsForSchool = cohortsBySchool.get(school.id) ?? []
            const totalMembers = membersBySchool.get(school.id) ?? 0
            return (
              <Card key={school.id}>
                <CardContent className="flex flex-col gap-5 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg text-foreground">{school.name}</h3>
                        <p className="text-xs text-muted-foreground">
                          {cohortsForSchool.length} team
                          {cohortsForSchool.length === 1 ? '' : 's'} ·{' '}
                          {totalMembers} member{totalMembers === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                    <SchoolMenu
                      schoolId={school.id}
                      initialName={school.name}
                      memberCount={totalMembers}
                    />
                  </div>

                  {cohortsForSchool.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No teams yet.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {cohortsForSchool.map((cohort) => {
                        const cohortMembers = membersByCohort.get(cohort.id) ?? []
                        return (
                          <div
                            key={cohort.id}
                            className="rounded-md border border-border bg-muted/20 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="font-medium text-foreground">
                                    {cohort.name}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    · Year {cohort.current_year}
                                  </span>
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {cohortMembers.length} member
                                  {cohortMembers.length === 1 ? '' : 's'}
                                </p>
                              </div>
                              <TeamMenu
                                cohortId={cohort.id}
                                initialName={cohort.name}
                                initialYear={cohort.current_year}
                                memberCount={cohortMembers.length}
                              />
                            </div>

                            <ul className="mt-3 flex flex-col divide-y divide-border rounded-md border border-border bg-background">
                              {cohortMembers.length === 0 ? (
                                <li className="px-3 py-2 text-xs text-muted-foreground">
                                  No members yet.
                                </li>
                              ) : (
                                cohortMembers.map((m) => {
                                  const fullName = m.profiles?.full_name ?? 'Unknown'
                                  return (
                                    <li
                                      key={m.profile_id}
                                      className="flex items-center justify-between gap-3 px-3 py-2"
                                    >
                                      <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                          <AvatarFallback className="text-xs">
                                            {initialsFor(fullName)}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col leading-tight">
                                          <span className="text-sm text-foreground">
                                            {fullName}
                                          </span>
                                          {m.profiles?.title ? (
                                            <span className="text-xs text-muted-foreground">
                                              {m.profiles.title}
                                            </span>
                                          ) : null}
                                        </div>
                                      </div>
                                      <RemoveMemberButton
                                        cohortId={cohort.id}
                                        profileId={m.profile_id}
                                        label={fullName}
                                      />
                                    </li>
                                  )
                                })
                              )}
                            </ul>

                            <div className="mt-3">
                              <AddMemberForm
                                cohortId={cohort.id}
                                fellows={unassignedFellows}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div>
                    <AddTeamForm
                      schoolId={school.id}
                      defaultName={`${school.name} Leadership Team`}
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
