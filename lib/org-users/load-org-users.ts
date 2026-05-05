import type { User } from '@supabase/supabase-js'

import { listAllAuthUsers } from '@/lib/auth/admin-auth-user-list'
import { ACTIVE_ORDER_STATUSES } from '@/lib/org-users/active-order-statuses'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'
import type { OrgUserRowJson } from '@/lib/org-users/types'

type ProfileRow = Database['public']['Tables']['profiles']['Row']

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
  }
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
  const authById = new Map(authUsers.map((u) => [u.id, u]))

  const profileIds = new Set(profiles.map((p) => p.id))
  const orphanAuthCount = authUsers.reduce((n, u) => n + (profileIds.has(u.id) ? 0 : 1), 0)
  if (orphanAuthCount > 0) {
    console.warn(
      `[loadOrgUsersForAdminPage] ${orphanAuthCount} auth user(s) have no matching public.profiles row`
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
