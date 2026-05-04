import type { User } from '@supabase/supabase-js'

import { ACTIVE_ORDER_STATUSES } from '@/lib/org-users/active-order-statuses'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { OrgUserRole, OrgUserRowJson } from '@/lib/org-users/types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

function mergeAuthProfile(u: User, p?: ProfileRow | null): OrgUserRowJson {
  const meta = u.user_metadata as Record<string, unknown> | undefined
  const metaName = typeof meta?.full_name === 'string' ? meta.full_name : null
  const metaRole = typeof meta?.role === 'string' ? meta.role : null
  const resolvedRole = (p?.role ??
    (metaRole === 'admin' ||
    metaRole === 'client' ||
    metaRole === 'sourcer' ||
    metaRole === 'manager' ||
    metaRole === 'copywriter'
      ? metaRole
      : 'client')) as OrgUserRole

  const profileEmail = p?.email ?? null
  const trimmedProfileEmail = profileEmail?.trim() ? profileEmail.trim() : null
  const displayEmail = trimmedProfileEmail ?? u.email ?? null

  return {
    id: u.id,
    email: displayEmail,
    profile_email: profileEmail,
    full_name: p?.full_name ?? metaName,
    role: resolvedRole,
    require_password_change: p?.require_password_change ?? false,
    last_sign_in_at: u.last_sign_in_at ?? null,
    banned_until: u.banned_until ?? null,
    avatar_url: p?.avatar_url ?? null,
    bio: p?.bio ?? null,
    company_name: p?.company_name ?? null,
    phone: p?.phone ?? null,
    created_at: p?.created_at ?? null,
  }
}

async function listAllAuthUsers(): Promise<User[]> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set on the server. Admin user management needs the Supabase service role key to list Auth users.'
    )
  }

  const perPage = 200
  let page = 1
  const out: User[] = []

  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }
    const batch = data.users
    out.push(...batch)
    if (batch.length < perPage) break
    page += 1
  }

  return out
}

export async function loadOrgUsersForAdminPage(): Promise<OrgUserRowJson[] | { forbidden: true }> {
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

  if (actorProfile?.role !== 'admin') {
    return { forbidden: true }
  }

  // `*` avoids runtime failures when optional columns (e.g. `bio`, mirrored `email`) are not migrated yet.
  const { data: profiles, error: profErr } = await supabase.from('profiles').select('*')

  if (profErr || !profiles) {
    throw new Error(profErr?.message ?? 'Failed to load profiles')
  }

  const authUsers = await listAllAuthUsers()
  const pmap = new Map(profiles.map((p) => [p.id, p]))

  const rows: OrgUserRowJson[] = authUsers.map((u) => mergeAuthProfile(u, pmap.get(u.id)))

  rows.sort((a, b) => {
    const ae = (a.email ?? a.full_name ?? '').toLowerCase()
    const be = (b.email ?? b.full_name ?? '').toLowerCase()
    return ae.localeCompare(be)
  })

  return rows
}

export async function loadOrgUserRowForAdmin(
  userId: string
): Promise<OrgUserRowJson | { forbidden: true } | null> {
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

  if (actorProfile?.role !== 'admin') {
    return { forbidden: true }
  }

  const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(userId)
  if (authErr || !authData?.user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  return mergeAuthProfile(authData.user, profile)
}

export async function loadOrgUserAssignmentCountsForAdmin(userId: string): Promise<
  | { forbidden: true }
  | {
      clientActiveOrders: number
      copywriterActiveOrders: number
      sourcerSitesCount: number
    }
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

  if (actorProfile?.role !== 'admin') {
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
