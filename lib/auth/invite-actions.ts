'use server'

import type { User } from '@supabase/supabase-js'

import { findAuthUserByEmailLower } from '@/lib/auth/admin-auth-user-list'
import { checkAndRecordAdminInviteRateLimit } from '@/lib/auth/admin-invite-rate-limit'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Json } from '@/lib/supabase/types'
import { getSiteOrigin } from '@/lib/site-url'
import { normalizeEmail } from '@/lib/validation/email'
import { ORG_INVITABLE_ROLES, type OrgInviteRole } from '@/lib/org-users/org-invite-roles'

export type InviteActionResult = { ok: true; message?: string } | { ok: false; message: string }

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
    return { error: 'Only an organization admin can invite users.' }
  }
  return { userId: user.id }
}

async function audit(
  actorId: string,
  action: string,
  email: string,
  meta?: Record<string, unknown>
) {
  await adminClient.from('auth_audit_log').insert({
    actor_id: actorId,
    action,
    target_email: email,
    meta: (meta ?? {}) as Json,
  })
}

export async function inviteTeamMember(input: {
  email: string
  role: string
  fullName?: string
}): Promise<InviteActionResult> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }
  if (!(await checkAndRecordAdminInviteRateLimit(gate.userId))) {
    return { ok: false, message: 'Too many invites. Try again in a minute.' }
  }

  const email = normalizeEmail(input.email)
  if (!email || !email.includes('@')) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  const role = input.role as OrgInviteRole
  if (!ORG_INVITABLE_ROLES.includes(role)) {
    return { ok: false, message: 'Invalid role for invitation.' }
  }

  const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/first-login-password')}`

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      full_name: input.fullName?.trim() || null,
      is_bootstrap_admin: false,
    },
    redirectTo,
  })

  if (error) {
    const low = error.message.toLowerCase()
    if (low.includes('already') || low.includes('registered')) {
      return {
        ok: false,
        message: 'This email may already be registered. Try resend invite or password reset.',
      }
    }
    return { ok: false, message: mapAuthError(error).message }
  }

  await audit(gate.userId, 'invite', email, { role })
  return { ok: true, message: 'Invitation sent.' }
}

export async function resendTeamInvite(input: { email: string }): Promise<InviteActionResult> {
  const gate = await assertAdmin()
  if ('error' in gate) {
    return { ok: false, message: gate.error }
  }
  if (!(await checkAndRecordAdminInviteRateLimit(gate.userId))) {
    return { ok: false, message: 'Too many requests. Try again in a minute.' }
  }

  const email = normalizeEmail(input.email)
  if (!email) {
    return { ok: false, message: 'Enter a valid email address.' }
  }

  let match: User | null
  try {
    match = await findAuthUserByEmailLower(email)
  } catch (err) {
    console.error('[resendTeamInvite] list users:', err)
    return { ok: false, message: 'Could not look up that user. Try again.' }
  }

  if (!match) {
    return { ok: false, message: 'No user found with that email. Send a new invite instead.' }
  }

  const lastSignIn = match.last_sign_in_at
  if (lastSignIn) {
    return {
      ok: false,
      message: 'This user has already signed in. They can use password reset if needed.',
    }
  }

  const roleRaw = (match.user_metadata?.role as string | undefined) ?? 'client'
  const role = ORG_INVITABLE_ROLES.includes(roleRaw as OrgInviteRole)
    ? (roleRaw as OrgInviteRole)
    : 'client'

  const redirectTo = `${getSiteOrigin()}/auth/callback?next=${encodeURIComponent('/auth/first-login-password')}`

  const { error } = await adminClient.auth.admin.inviteUserByEmail(email, {
    data: {
      role,
      full_name: (match.user_metadata?.full_name as string | undefined) ?? null,
      is_bootstrap_admin: false,
    },
    redirectTo,
  })

  if (error) {
    return { ok: false, message: mapAuthError(error).message }
  }

  await audit(gate.userId, 'resend_invite', email, { role })
  return { ok: true, message: 'Invitation sent again.' }
}
