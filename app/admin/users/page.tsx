import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { InviteUserDialog } from './invite-user-dialog'
import { UserRow } from './user-row'
import { ROLE_LABELS, type Role } from '@/lib/roles'

type CohortSummary = { id: string; name: string }

type UserRowData = {
  id: string
  full_name: string | null
  email: string | null
  title: string | null
  role: Role
  deactivated_at: string | null
  cohort_id: string | null
  cohort_name: string | null
  last_sign_in_at: string | null
  invited_at: string | null
  email_confirmed_at: string | null
}

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const admin = createAdminClient()

  // Cohorts for the assignment dropdown.
  const { data: cohorts } = await supabase
    .from('cohorts')
    .select('id, name')
    .order('name', { ascending: true })

  // Profiles (DB is source of truth for name/role/title/cohort).
  const { data: profiles } = await supabase
    .from('profiles')
    .select(
      `
        id, full_name, email, title, role, deactivated_at,
        cohort_members ( cohort_id, cohorts ( id, name ) )
      `,
    )
    .order('full_name', { ascending: true, nullsFirst: false })

  // Auth metadata (invite/last sign-in) via service role.
  const { data: authList } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const authById = new Map(authList?.users.map((u) => [u.id, u]))

  const users: UserRowData[] = (profiles ?? []).map((p: any) => {
    const member = Array.isArray(p.cohort_members) ? p.cohort_members[0] : p.cohort_members
    const cohort = member?.cohorts ?? null
    const authUser = authById.get(p.id)
    return {
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      title: p.title,
      role: p.role as Role,
      deactivated_at: p.deactivated_at,
      cohort_id: cohort?.id ?? null,
      cohort_name: cohort?.name ?? null,
      last_sign_in_at: authUser?.last_sign_in_at ?? null,
      invited_at: authUser?.invited_at ?? null,
      email_confirmed_at: authUser?.email_confirmed_at ?? null,
    }
  })

  const cohortList: CohortSummary[] = (cohorts ?? []).map((c) => ({ id: c.id, name: c.name }))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-serif text-foreground">Users</h2>
          <p className="text-sm text-muted-foreground">
            {users.length} total · Invite new people, adjust roles, and assign cohorts.
          </p>
        </div>
        <InviteUserDialog cohorts={cohortList} />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="hidden grid-cols-12 gap-4 border-b border-border px-5 py-3 text-xs font-medium uppercase tracking-wider text-muted-foreground md:grid">
            <div className="col-span-4">Name</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-3">Cohort</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <UserRow key={u.id} user={u} cohorts={cohortList} />
            ))}
            {users.length === 0 && (
              <li className="p-10 text-center text-sm text-muted-foreground">
                No users yet. Invite someone to get started.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Roles: {Object.values(ROLE_LABELS).join(' · ')}
      </p>
    </div>
  )
}
