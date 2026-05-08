#!/usr/bin/env node
/**
 * Static checks aligned with security hardening verification (no live DB or browser).
 * Run: node scripts/verify-security-hardening-checklist.mjs
 */

import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

function read(p) {
  return readFileSync(join(root, p), 'utf8')
}

function must(cond, msg) {
  if (!cond) throw new Error(msg)
}

const checks = []

try {
  must(
    existsSync(join(root, 'supabase/migrations/20260509120000_profiles_select_admin_only.sql')),
    'Missing migration 20260509120000_profiles_select_admin_only.sql'
  )
  const pol = read('supabase/migrations/20260509120000_profiles_select_admin_only.sql')
  must(pol.includes("get_my_role() = 'admin'"), 'Admin-only profiles SELECT policy not found')

  must(
    existsSync(join(root, 'supabase/migrations/20260509120001_admin_invite_rate_events.sql')),
    'Missing migration 20260509120001_admin_invite_rate_events.sql'
  )
  const rt = read('supabase/migrations/20260509120001_admin_invite_rate_events.sql')
  must(rt.includes('admin_invite_rate_events'), 'Rate limit table name not in migration')

  must(
    existsSync(
      join(root, 'supabase/migrations/20260510120002_error_logs_insert_own_user_only.sql')
    ),
    'Missing migration 20260510120002_error_logs_insert_own_user_only.sql'
  )
  const errPol = read('supabase/migrations/20260510120002_error_logs_insert_own_user_only.sql')
  must(
    errPol.includes('user_id = auth.uid()'),
    'error_logs insert policy must tie user_id to auth.uid()'
  )

  must(
    existsSync(join(root, 'supabase/migrations/20260510120001_public_rate_limit_events.sql')),
    'Missing migration 20260510120001_public_rate_limit_events.sql'
  )
  const pubRt = read('supabase/migrations/20260510120001_public_rate_limit_events.sql')
  must(
    pubRt.includes('public_rate_limit_events'),
    'public_rate_limit_events table not in migration'
  )

  const invite = read('lib/auth/invite-actions.ts')
  must(invite.includes('findAuthUserByEmailLower'), 'Resend should use paginated Auth lookup')
  must(invite.includes('checkAndRecordAdminInviteRateLimit'), 'Invite should use DB rate limit')
  must(
    invite.includes('/auth/first-login-password'),
    'Invite redirectTo should target first-login-password'
  )

  const reset = read('lib/auth/password-reset-actions.ts')
  must(
    reset.includes('return { ok: true }'),
    'Password reset should return ok: true for anti-enumeration'
  )
  must(
    !reset.includes('auth_user_email_exists'),
    'auth_user_email_exists should not be used in reset action'
  )
  must(
    reset.includes('tryConsumePasswordResetRateLimit'),
    'Password reset should use public rate limit helper'
  )

  const clientErr = read('app/api/client-error/route.ts')
  must(clientErr.includes('checkAndRecordPublicRateLimit'), 'Client error route should rate limit')

  const forgot = read('components/auth/forgot-password-form.tsx')
  must(forgot.includes('If an account exists'), 'Forgot-password success copy should be neutral')

  const usersPage = read('app/(app)/settings/users/page.tsx')
  must(usersPage.includes("profile?.role !== 'admin'"), 'Users page must gate on admin')
  must(usersPage.includes('notFound()'), 'Users page must notFound for non-admin')

  const nav = read('lib/app-nav.ts')
  // Users entry must only be reachable from the admin branch of getAppNavItems.
  const usersInAdminOnly = /case 'admin':\s*\n\s*return\s*\[[^\]]*\busers\b[^\]]*\]/m.test(nav)
  must(usersInAdminOnly, 'Nav should hide Users for non-admin')
  // No other case should include the `users` constant in its returned array.
  for (const r of ['client', 'manager', 'sourcer', 'copywriter']) {
    const re = new RegExp(`case '${r}':\\s*\\n\\s*return\\s*\\[[^\\]]*\\busers\\b[^\\]]*\\]`, 'm')
    must(!re.test(nav), `Nav for ${r} role should not include Users`)
  }
  must(nav.includes('/settings/users'), 'Nav should include Users href for admin')

  const setPw = read('components/auth/set-password-form.tsx')
  must(
    setPw.includes('/auth/login'),
    'First-login flow should redirect to login after password set'
  )
  must(setPw.includes('submitSetPasswordAction'), 'Set password should use submitSetPasswordAction')
  must(
    !setPw.includes('completePasswordChange'),
    'Set password form should not use completePasswordChange'
  )

  const appUser = read('lib/supabase/cached-app-user.server.ts')
  must(
    appUser.includes(".eq('id', user.id)"),
    'cached-app-user must load profile scoped to session user id'
  )

  const updateOwn = read('lib/profile/update-own-profile.ts')
  must(updateOwn.includes('isOwnAvatarsPublicObjectUrl'), 'Own profile should validate avatar URL')

  checks.push('All static security-hardening checks passed.')
} catch (e) {
  console.error(e instanceof Error ? e.message : e)
  process.exit(1)
}

for (const c of checks) console.log(c)
console.log(
  '\nDB: Run `npx supabase migration list` and confirm the Remote column includes 20260509120000, 20260509120001, 20260510120000 (admin_invite_rate service_role), 20260510120001, and 20260510120002 (error_logs).' +
    '\nIf `db push` fails on storage.buckets ownership, apply pending SQL from the Dashboard (SQL editor) or fix migration privileges per Supabase docs.'
)
