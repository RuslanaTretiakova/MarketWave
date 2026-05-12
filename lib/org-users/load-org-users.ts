import type { User } from '@supabase/supabase-js'

import { splitDisplayName } from '@/lib/user-display-name'

import { listAllAuthUsers } from '@/lib/auth/admin-auth-user-list'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { ACTIVE_ORDER_STATUSES } from '@/lib/org-users/active-order-statuses'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { OrgUserRole, OrgUserRowJson } from '@/lib/org-users/types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type OrgUsersListRoleFilter = 'all' | OrgUserRole
export type OrgUsersListStatusFilter = 'all' | 'active' | 'invited' | 'disabled'

const ORG_USER_ROLES: readonly OrgUserRole[] = [
  'admin',
  'client',
  'sourcer',
  'manager',
  'copywriter',
]

export function parseOrgUsersListRoleFilter(raw: string | undefined): OrgUsersListRoleFilter {
  if (raw && raw !== 'all' && ORG_USER_ROLES.includes(raw as OrgUserRole)) {
    return raw as OrgUserRole
  }
  return 'all'
}

export function parseOrgUsersListStatusFilter(raw: string | undefined): OrgUsersListStatusFilter {
  if (raw === 'active' || raw === 'invited' || raw === 'disabled') return raw
  return 'all'
}

export function parseSettingsTablePage(raw: string | undefined): number {
  return Math.max(1, Math.floor(Number(raw)) || 1)
}

/** `profiles` is the directory; Auth enriches sign-in and ban state when present. */
function mergeOrgUserRow(profile: ProfileRow, authUser: User | undefined): OrgUserRowJson {
  const meta = authUser?.user_metadata as Record<string, unknown> | undefined
  const metaName = typeof meta?.full_name === 'string' ? meta.full_name : null

  const profileEmail = profile.email ?? null
  const trimmedProfileEmail = profileEmail?.trim() ? profileEmail.trim() : null
  const displayEmail = trimmedProfileEmail ?? authUser?.email ?? null

  return {
    id: profile.id,
    email: displayEmail,
    profile_email: profileEmail,
    full_name: profile.full_name ?? metaName,
    role: profile.role,
    require_password_change: profile.require_password_change ?? false,
    last_sign_in_at: authUser?.last_sign_in_at ?? null,
    banned_until: authUser?.banned_until ?? null,
    avatar_url: profile.avatar_url ?? null,
    bio: profile.bio ?? null,
    company_name: profile.company_name ?? null,
    phone: profile.phone ?? null,
    created_at: profile.created_at ?? null,
    account_manager_id: profile.account_manager_id ?? null,
  }
}

function adminUserDisplayNameServer(row: OrgUserRowJson): string {
  const email = row.email ?? ''
  const { first, last } = splitDisplayName(row.full_name, email)
  const combined = [first, last].filter(Boolean).join(' ')
  return combined.trim() || email || 'User'
}

function isUserBannedRow(row: OrgUserRowJson): boolean {
  if (!row.banned_until) return false
  return new Date(row.banned_until) > new Date()
}

function rowStatusFromRow(row: OrgUserRowJson): 'active' | 'invited' | 'disabled' {
  if (isUserBannedRow(row)) return 'disabled'
  if (row.require_password_change) return 'invited'
  return 'active'
}

function rowMatchesOrgSearch(row: OrgUserRowJson, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const name = adminUserDisplayNameServer(row).toLowerCase()
  const email = (row.email ?? '').toLowerCase()
  return name.includes(needle) || email.includes(needle)
}

function rowMatchesStatusFilter(row: OrgUserRowJson, status: OrgUsersListStatusFilter): boolean {
  if (status === 'all') return true
  return rowStatusFromRow(row) === status
}

async function assertAdminOrManagerOrgList(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; currentUserId: string }
  | { forbidden: true }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { forbidden: true }
  }

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (actorProfile?.role !== 'admin' && actorProfile?.role !== 'manager') {
    return { forbidden: true }
  }

  return { supabase, currentUserId: user.id }
}

/**
 * Paginated user directory for admin UI.
 * Uses profile+Auth merge + in-memory filter when search is active or status is narrowed (display email/name/status come from Auth).
 * Otherwise SQL pagination on `profiles` only.
 */
async function loadOrgUsersListWithSupabase(
  supabase: Awaited<ReturnType<typeof createClient>>,
  input: {
    page: number
    pageSize: number
    q: string
    role: OrgUsersListRoleFilter
    status: OrgUsersListStatusFilter
    excludeId?: string
  }
): Promise<{ rows: OrgUserRowJson[]; totalCount: number; page: number }> {
  const pageSize = input.pageSize
  let page = Math.max(1, Math.floor(input.page) || 1)
  const trimmedQ = input.q.trim()

  if (input.status !== 'all' || trimmedQ !== '') {
    const merged = await loadOrgUsersDirectoryMergedInner(supabase)
    const filtered = merged.filter((row) => {
      if (input.excludeId && row.id === input.excludeId) return false
      if (input.role !== 'all' && row.role !== input.role) return false
      if (!rowMatchesOrgSearch(row, trimmedQ)) return false
      if (!rowMatchesStatusFilter(row, input.status)) return false
      return true
    })
    const totalCount = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) page = totalPages
    const from = (page - 1) * pageSize
    const rows = filtered.slice(from, from + pageSize)
    return { rows, totalCount, page }
  }

  function buildProfilesQuery() {
    let q = supabase.from('profiles').select('*', { count: 'exact' })
    if (input.role !== 'all') {
      q = q.eq('role', input.role)
    }
    if (input.excludeId) {
      q = q.neq('id', input.excludeId)
    }
    return q
      .order('email', { ascending: true, nullsFirst: true })
      .order('full_name', { ascending: true, nullsFirst: true })
  }

  let profiles: ProfileRow[] | null = null
  let totalCount = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    const { data, error, count } = await buildProfilesQuery().range(from, to)

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to load profiles')
    }

    totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) {
      page = totalPages
      continue
    }

    profiles = data as ProfileRow[]
    break
  }

  const pageProfiles = profiles ?? []
  const rows: OrgUserRowJson[] = await Promise.all(
    pageProfiles.map(async (p) => {
      const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(p.id)
      const authUser = !authErr && authData?.user ? authData.user : undefined
      return mergeOrgUserRow(p, authUser)
    })
  )

  return { rows, totalCount, page }
}

/**
 * Paginated user directory for admin UI.
 * Uses profile+Auth merge + in-memory filter when search is active or status is narrowed (display email/name/status come from Auth).
 * Otherwise SQL pagination on `profiles` only.
 */
export async function loadOrgUsersListForAdmin(input: {
  page: number
  pageSize?: number
  q: string
  role: OrgUsersListRoleFilter
  status: OrgUsersListStatusFilter
}): Promise<{ forbidden: true } | { rows: OrgUserRowJson[]; totalCount: number; page: number }> {
  const pageSize = input.pageSize ?? SETTINGS_TABLE_PAGE_SIZE
  const gate = await assertAdminOrManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase, currentUserId } = gate

  return loadOrgUsersListWithSupabase(supabase, {
    ...input,
    pageSize,
    excludeId: currentUserId,
  })
}

/** All copywriter profiles merged with Auth (excludes banned). Used for reassignment pickers. */
export async function loadOrgCopywriterCandidatesForAdmin(): Promise<
  OrgUserRowJson[] | { forbidden: true }
> {
  const gate = await assertAdminOrManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase } = gate

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'copywriter')
    .order('email', { ascending: true, nullsFirst: true })
    .order('full_name', { ascending: true, nullsFirst: true })

  if (error || !profiles) {
    throw new Error(error?.message ?? 'Failed to load copywriters')
  }

  const rows: OrgUserRowJson[] = await Promise.all(
    profiles.map(async (p) => {
      const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(p.id)
      const authUser = !authErr && authData?.user ? authData.user : undefined
      return mergeOrgUserRow(p, authUser)
    })
  )

  return rows.filter((r) => !isUserBannedRow(r))
}

async function loadOrgUsersDirectoryMergedInner(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<OrgUserRowJson[]> {
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*')

  if (profErr || !profiles) {
    throw new Error(profErr?.message ?? 'Failed to load profiles')
  }

  const authUsers = await listAllAuthUsers()
  const authById = new Map(authUsers.map((u) => [u.id, u]))

  const profileIds = new Set(profiles.map((p) => p.id))
  const orphanAuthCount = authUsers.reduce((n, u) => n + (profileIds.has(u.id) ? 0 : 1), 0)
  if (orphanAuthCount > 0) {
    console.warn(
      `[loadOrgUsersDirectoryMerged] ${orphanAuthCount} auth user(s) have no matching public.profiles row`
    )
  }

  const rows: OrgUserRowJson[] = profiles.map((p) => mergeOrgUserRow(p, authById.get(p.id)))

  rows.sort((a, b) => {
    const ae = (a.email ?? a.full_name ?? '').toLowerCase()
    const be = (b.email ?? b.full_name ?? '').toLowerCase()
    return ae.localeCompare(be)
  })

  return rows
}

export async function loadOrgUsersForAdminPage(): Promise<OrgUserRowJson[] | { forbidden: true }> {
  const gate = await assertAdminOrManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  return loadOrgUsersDirectoryMergedInner(gate.supabase)
}

export async function loadOrgUserRowForAdmin(
  userId: string
): Promise<OrgUserRowJson | { forbidden: true } | null> {
  const gate = await assertAdminOrManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase } = gate

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return null
  }

  const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(userId)
  const authUser = !authErr && authData?.user ? authData.user : undefined

  return mergeOrgUserRow(profile, authUser)
}

export async function loadOrgUserAssignmentCountsForAdmin(userId: string): Promise<
  | { forbidden: true }
  | {
      clientActiveOrders: number
      copywriterActiveOrders: number
      sourcerSitesCount: number
    }
> {
  const gate = await assertAdminOrManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase } = gate

  const { count: clientActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: copywriterActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('copywriter_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: sourcerSitesCount } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('sourcer_id', userId)

  return {
    clientActiveOrders: clientActiveOrders ?? 0,
    copywriterActiveOrders: copywriterActiveOrders ?? 0,
    sourcerSitesCount: sourcerSitesCount ?? 0,
  }
}

async function assertManagerOrgList(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; currentUserId: string }
  | { forbidden: true }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { forbidden: true }
  }

  const { data: actorProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (actorProfile?.role !== 'manager') {
    return { forbidden: true }
  }

  return { supabase, currentUserId: user.id }
}

/**
 * Paginated user directory for managers (same listing rules as admin; UI remains read-only for most actions).
 */
export async function loadOrgUsersListForManager(input: {
  page: number
  pageSize?: number
  q: string
  role: OrgUsersListRoleFilter
  status: OrgUsersListStatusFilter
}): Promise<{ forbidden: true } | { rows: OrgUserRowJson[]; totalCount: number; page: number }> {
  const pageSize = input.pageSize ?? SETTINGS_TABLE_PAGE_SIZE
  const gate = await assertManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase, currentUserId } = gate

  return loadOrgUsersListWithSupabase(supabase, {
    ...input,
    pageSize,
    excludeId: currentUserId,
  })
}

export async function loadOrgUserRowForManager(
  userId: string
): Promise<OrgUserRowJson | { forbidden: true } | null> {
  const gate = await assertManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase } = gate

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return null
  }

  const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(userId)
  const authUser = !authErr && authData?.user ? authData.user : undefined

  return mergeOrgUserRow(profile, authUser)
}

export async function loadOrgUserAssignmentCountsForManager(userId: string): Promise<
  | { forbidden: true }
  | {
      clientActiveOrders: number
      copywriterActiveOrders: number
      sourcerSitesCount: number
    }
> {
  const gate = await assertManagerOrgList()
  if ('forbidden' in gate) {
    return { forbidden: true }
  }
  const { supabase } = gate

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!profile) {
    return { forbidden: true }
  }

  const { count: clientActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: copywriterActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('copywriter_id', userId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: sourcerSitesCount } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('sourcer_id', userId)

  return {
    clientActiveOrders: clientActiveOrders ?? 0,
    copywriterActiveOrders: copywriterActiveOrders ?? 0,
    sourcerSitesCount: sourcerSitesCount ?? 0,
  }
}
