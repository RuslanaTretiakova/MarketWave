import type { User } from '@supabase/supabase-js'

import { getInviteEmailRedirectTo } from '@/lib/auth/invite-email-redirect'
import {
  readNonNegativeIntEnv,
  readPositiveIntEnv,
  shouldSendInviteReminder,
} from '@/lib/auth/invite-reminder-eligibility'
import { mapAuthError } from '@/lib/auth/map-auth-error'
import { ORG_INVITABLE_ROLES, type OrgInviteRole } from '@/lib/org-users/org-invite-roles'
import { adminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'
import { productionServerEmailRedirectBlockedMessage } from '@/lib/site-url'

export type InviteReminderCronResult =
  | { ok: true; sent: number; skipped: number; errors: number; scanned: number }
  | { ok: false; message: string }

type ProfileReminderRow = {
  id: string
  email: string | null
  role: string
  require_password_change: boolean
  last_automated_invite_reminder_at: string | null
  created_at: string
}

function resolveInviteRole(user: User): OrgInviteRole {
  const roleRaw = (user.user_metadata?.role as string | undefined) ?? 'client'
  return ORG_INVITABLE_ROLES.includes(roleRaw as OrgInviteRole)
    ? (roleRaw as OrgInviteRole)
    : 'client'
}

async function auditCronInvite(targetEmail: string, userId: string) {
  try {
    const { error } = await adminClient.from('auth_audit_log').insert({
      actor_id: null,
      action: 'invite_reminder_cron',
      target_email: targetEmail,
      meta: { user_id: userId } as Json,
    })
    if (error) {
      console.error('[invite-reminder-cron] audit insert failed:', error.message)
    }
  } catch (err) {
    console.error('[invite-reminder-cron] audit', err)
  }
}

/**
 * Sends up to `INVITE_REMINDER_MAX_PER_RUN` invite emails for users still requiring first password.
 * Uses service role; intended for secured cron routes only.
 */
export async function runInviteReminderCronInternal(): Promise<InviteReminderCronResult> {
  const block = productionServerEmailRedirectBlockedMessage()
  if (block) {
    return { ok: false, message: block }
  }

  const cooldownDays = readPositiveIntEnv('INVITE_REMINDER_COOLDOWN_DAYS', 7)
  const minUserAgeHours = readNonNegativeIntEnv('INVITE_REMINDER_MIN_USER_AGE_HOURS', 48)
  const maxPerRun = readPositiveIntEnv('INVITE_REMINDER_MAX_PER_RUN', 15)
  const fetchLimit = Math.min(Math.max(maxPerRun * 10, maxPerRun), 200)

  const now = new Date()
  const nowMs = now.getTime()
  const nowIso = now.toISOString()

  const { data: rows, error: qErr } = await adminClient
    .from('profiles')
    .select(
      'id, email, role, require_password_change, last_automated_invite_reminder_at, created_at'
    )
    .eq('require_password_change', true)
    .neq('role', 'admin')
    .not('email', 'is', null)
    .order('last_automated_invite_reminder_at', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: true })
    .limit(fetchLimit)

  if (qErr) {
    console.error('[invite-reminder-cron] profiles query:', qErr.message)
    return { ok: false, message: 'Could not load profiles for invite reminders.' }
  }

  const list = (rows ?? []) as ProfileReminderRow[]
  let sent = 0
  let skipped = 0
  let errors = 0

  for (const row of list) {
    if (sent >= maxPerRun) break

    const { data: authData, error: authErr } = await adminClient.auth.admin.getUserById(row.id)
    if (authErr || !authData?.user) {
      errors += 1
      console.error(
        '[invite-reminder-cron] getUserById:',
        authErr?.message ?? 'missing user',
        row.id
      )
      continue
    }

    const user = authData.user
    const decision = shouldSendInviteReminder({
      profile: {
        require_password_change: row.require_password_change,
        role: row.role,
        email: row.email,
        last_automated_invite_reminder_at: row.last_automated_invite_reminder_at,
      },
      auth: {
        last_sign_in_at: user.last_sign_in_at ?? null,
        banned_until: user.banned_until ?? null,
        created_at: user.created_at ?? null,
      },
      nowMs,
      cooldownDays,
      minUserAgeHours,
    })

    if (!decision.ok) {
      skipped += 1
      continue
    }

    const email = (row.email?.trim() || user.email?.trim() || '').trim()
    if (!email.includes('@')) {
      skipped += 1
      continue
    }

    const role = resolveInviteRole(user)
    const redirectTo = getInviteEmailRedirectTo()

    const { error: invErr } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: {
        role,
        full_name: (user.user_metadata?.full_name as string | undefined) ?? null,
        is_bootstrap_admin: false,
      },
      redirectTo,
    })

    if (invErr) {
      errors += 1
      const mapped = mapAuthError(invErr)
      console.error('[invite-reminder-cron] inviteUserByEmail:', invErr.message, mapped.code)
      continue
    }

    const { error: upErr } = await adminClient
      .from('profiles')
      .update({ last_automated_invite_reminder_at: nowIso })
      .eq('id', row.id)

    if (upErr) {
      errors += 1
      console.error('[invite-reminder-cron] profile timestamp update:', upErr.message)
      continue
    }

    await auditCronInvite(email, row.id)
    sent += 1
  }

  return {
    ok: true,
    sent,
    skipped,
    errors,
    scanned: list.length,
  }
}
