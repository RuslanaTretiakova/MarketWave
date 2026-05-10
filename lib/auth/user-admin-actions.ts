'use server'

import { revalidatePath } from 'next/cache'

import { ACTIVE_ORDER_STATUSES } from '@/lib/org-users/active-order-statuses'
import { ORG_INVITABLE_ROLES, type OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

async function assertAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { error: 'You must be signed in.' }
  }
  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || profile?.role !== 'admin') {
    return { error: 'Only an organization admin can do this.' }
  }
  return { userId: user.id }
}

export async function updateTeamMemberProfile(input: {
  targetUserId: string
  full_name: string | null
  role: OrgInviteRole
  company_name: string | null
  phone: string | null
  bio: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const supabase = await createClient()
  const trimmedName = input.full_name?.trim() || null
  const company = input.company_name?.trim() || null
  const phone = input.phone?.trim() || null
  const bio = input.bio?.trim() || null

  const profileFields = {
    full_name: trimmedName,
    company_name: company,
    phone,
    bio,
  }

  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', input.targetUserId)
    .maybeSingle()

  if (targetErr || !target) {
    return { ok: false, message: 'User not found.' }
  }

  const actorUserId = gate.userId

  function revalidateUserPaths() {
    revalidatePath('/settings/users')
    revalidatePath(`/settings/users/${input.targetUserId}`)
    if (actorUserId === input.targetUserId) {
      revalidatePath('/settings/profile')
    }
  }

  if (target.role === 'admin') {
    const { error } = await supabase
      .from('profiles')
      .update(profileFields)
      .eq('id', input.targetUserId)

    if (error) {
      if (error.code === 'P0001') {
        return { ok: false, message: error.message }
      }
      return { ok: false, message: 'Could not update this profile.' }
    }
    revalidateUserPaths()
    return { ok: true }
  }

  if (!ORG_INVITABLE_ROLES.includes(input.role)) {
    return { ok: false, message: 'Invalid role.' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      ...profileFields,
      role: input.role,
    })
    .eq('id', input.targetUserId)

  if (error) {
    if (error.code === 'P0001') {
      return { ok: false, message: error.message }
    }
    return { ok: false, message: 'Could not update this profile.' }
  }

  revalidateUserPaths()
  return { ok: true }
}

export async function setTeamMemberBanned(input: {
  targetUserId: string
  banned: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  if (input.targetUserId === gate.userId) {
    return { ok: false, message: 'You cannot change your own access here.' }
  }

  const supabase = await createClient()
  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', input.targetUserId)
    .maybeSingle()

  if (targetErr || !target) {
    return { ok: false, message: 'User not found.' }
  }

  if (target.role === 'admin' && input.banned) {
    return { ok: false, message: 'The organization admin cannot be disabled from this screen.' }
  }

  const { error } = await adminClient.auth.admin.updateUserById(input.targetUserId, {
    ban_duration: input.banned ? '876000h' : 'none',
  })

  if (error) {
    return { ok: false, message: mapAuthError(error).message }
  }

  revalidatePath('/settings/users')
  revalidatePath(`/settings/users/${input.targetUserId}`)
  return { ok: true }
}

type ResolveDisableOk = {
  ok: true
  role: UserRole
  clientActiveOrders: number
  copywriterActiveOrders: number
  sourcerSitesCount: number
}

type ResolveDisableErr = { ok: false; message: string }

async function resolveDisableTarget(
  actorUserId: string,
  targetUserId: string
): Promise<ResolveDisableOk | ResolveDisableErr> {
  if (targetUserId === actorUserId) {
    return { ok: false, message: 'You cannot change your own access here.' }
  }

  const supabase = await createClient()
  const { data: target, error: targetErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .maybeSingle()

  if (targetErr || !target) {
    return { ok: false, message: 'User not found.' }
  }

  if (target.role === 'admin') {
    return { ok: false, message: 'The organization admin cannot be disabled from this screen.' }
  }

  const { count: clientActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', targetUserId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: copywriterActiveOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('copywriter_id', targetUserId)
    .in('status', ACTIVE_ORDER_STATUSES)

  const { count: sourcerSitesCount } = await supabase
    .from('sites')
    .select('id', { count: 'exact', head: true })
    .eq('sourcer_id', targetUserId)

  return {
    ok: true,
    role: target.role,
    clientActiveOrders: clientActiveOrders ?? 0,
    copywriterActiveOrders: copywriterActiveOrders ?? 0,
    sourcerSitesCount: sourcerSitesCount ?? 0,
  }
}

export type DisablePreviewResult =
  | { ok: false; message: string }
  | {
      ok: true
      flow: 'simple' | 'reassign_copywriter' | 'sourcer_cleanup'
      clientActiveOrders: number
      copywriterActiveOrders: number
      sourcerSitesCount: number
      role: UserRole
    }

/** Admin-only: inspect disable rules before showing a confirmation UI. */
export async function previewDisableUser(targetUserId: string): Promise<DisablePreviewResult> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const resolved = await resolveDisableTarget(gate.userId, targetUserId)
  if (!resolved.ok) {
    return { ok: false, message: resolved.message }
  }

  const { role, clientActiveOrders, copywriterActiveOrders, sourcerSitesCount } = resolved

  if ((role === 'client' || role === 'manager') && clientActiveOrders > 0) {
    return {
      ok: false,
      message: `This user has ${clientActiveOrders} active order${clientActiveOrders === 1 ? '' : 's'}. Resolve or complete them before disabling.`,
    }
  }

  if (role === 'copywriter' && copywriterActiveOrders > 0) {
    return {
      ok: true,
      flow: 'reassign_copywriter',
      clientActiveOrders,
      copywriterActiveOrders,
      sourcerSitesCount,
      role,
    }
  }

  if (role === 'sourcer') {
    return {
      ok: true,
      flow: 'sourcer_cleanup',
      clientActiveOrders,
      copywriterActiveOrders,
      sourcerSitesCount,
      role,
    }
  }

  return {
    ok: true,
    flow: 'simple',
    clientActiveOrders,
    copywriterActiveOrders,
    sourcerSitesCount,
    role,
  }
}

export async function disableTeamMemberAfterConfirmation(input: {
  targetUserId: string
  reassignCopywriterTo?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const resolved = await resolveDisableTarget(gate.userId, input.targetUserId)
  if (!resolved.ok) {
    return { ok: false, message: resolved.message }
  }

  const { role, clientActiveOrders, copywriterActiveOrders } = resolved

  if ((role === 'client' || role === 'manager') && clientActiveOrders > 0) {
    return {
      ok: false,
      message: `This user has ${clientActiveOrders} active order${clientActiveOrders === 1 ? '' : 's'}. Resolve them before disabling.`,
    }
  }

  if (role === 'copywriter' && copywriterActiveOrders > 0) {
    const replacement = input.reassignCopywriterTo?.trim()
    if (!replacement || replacement === input.targetUserId) {
      return { ok: false, message: 'Choose another copywriter to receive active orders.' }
    }

    const supabase = await createClient()
    const { data: replacementProfile, error: repErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', replacement)
      .maybeSingle()

    if (repErr || replacementProfile?.role !== 'copywriter') {
      return { ok: false, message: 'Replacement must be an active copywriter profile.' }
    }

    const { error: ordErr } = await adminClient
      .from('orders')
      .update({ copywriter_id: replacement })
      .eq('copywriter_id', input.targetUserId)
      .in('status', ACTIVE_ORDER_STATUSES)

    if (ordErr) {
      return { ok: false, message: 'Could not reassign orders. Try again.' }
    }
  }

  if (role === 'sourcer') {
    const { error: siteErr } = await adminClient
      .from('sites')
      .update({ sourcer_id: null })
      .eq('sourcer_id', input.targetUserId)

    if (siteErr) {
      return { ok: false, message: 'Could not clear site sourcing assignments. Try again.' }
    }
  }

  const { error } = await adminClient.auth.admin.updateUserById(input.targetUserId, {
    ban_duration: '876000h',
  })

  if (error) {
    return { ok: false, message: mapAuthError(error).message }
  }

  revalidatePath('/settings/users')
  revalidatePath(`/settings/users/${input.targetUserId}`)
  return { ok: true }
}

export async function setClientAccountManager(input: {
  clientUserId: string
  managerId: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }

  const { data: client, error: cErr } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', input.clientUserId)
    .maybeSingle()
  if (cErr || !client || client.role !== 'client') {
    return { ok: false, message: 'Account manager can only be set for client users.' }
  }

  if (input.managerId) {
    const { data: mgr, error: mErr } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', input.managerId)
      .maybeSingle()
    if (mErr || !mgr || mgr.role !== 'manager') {
      return { ok: false, message: 'Select a valid manager.' }
    }
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ account_manager_id: input.managerId })
    .eq('id', input.clientUserId)

  if (error) {
    return { ok: false, message: error.message ?? 'Could not update account manager.' }
  }

  revalidatePath('/settings/users')
  revalidatePath(`/settings/users/${input.clientUserId}`)
  return { ok: true }
}

/** Activate (unban) after confirmation — same guards as unban path except admin role still applies to disabled admin edge cases (normally N/A). */
export async function activateTeamMember(
  targetUserId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  return setTeamMemberBanned({ targetUserId, banned: false })
}
