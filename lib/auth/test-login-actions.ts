'use server'

import { findAuthUserByEmailLower } from '@/lib/auth/admin-auth-user-list'
import { adminClient } from '@/lib/supabase/admin'
import type { Database } from '@/lib/supabase/types'

type Role = Database['public']['Enums']['user_role']

const TEST_PASSWORD = 'hello12345'

const TEST_USERS: Array<{ role: Role; email: string; fullName: string }> = [
  { role: 'sourcer', email: 'test.sourcer@local.marketweave', fullName: 'Test Sourcer' },
  { role: 'manager', email: 'test.manager@local.marketweave', fullName: 'Test Manager' },
  { role: 'client', email: 'test.client@local.marketweave', fullName: 'Test Client' },
  { role: 'copywriter', email: 'test.copywriter@local.marketweave', fullName: 'Test Copywriter' },
]

function testLoginEnabled(): boolean {
  const override = process.env.ENABLE_TEST_LOGIN?.trim().toLowerCase()
  if (override === 'true') return true
  return process.env.NODE_ENV === 'development'
}

export async function ensureTestUsersForLogin(): Promise<
  | { ok: true; users: Array<{ role: Role; email: string }>; passwordHint: string }
  | { ok: false; message: string }
> {
  if (!testLoginEnabled()) {
    return { ok: false, message: 'Test login helper is disabled in this environment.' }
  }

  try {
    for (const target of TEST_USERS) {
      const email = target.email.trim().toLowerCase()
      let user = await findAuthUserByEmailLower(email)

      if (!user) {
        const { data, error } = await adminClient.auth.admin.createUser({
          email,
          password: TEST_PASSWORD,
          email_confirm: true,
          user_metadata: {
            role: target.role,
            full_name: target.fullName,
            is_bootstrap_admin: false,
          },
        })
        if (error || !data.user) {
          return {
            ok: false,
            message: error?.message ?? `Failed creating ${target.role} test user.`,
          }
        }
        user = data.user
      } else {
        const { error } = await adminClient.auth.admin.updateUserById(user.id, {
          password: TEST_PASSWORD,
          user_metadata: {
            ...(user.user_metadata ?? {}),
            role: target.role,
            full_name: target.fullName,
            is_bootstrap_admin: false,
          },
        })
        if (error) {
          return { ok: false, message: error.message }
        }
      }

      const { error: profileErr } = await adminClient
        .from('profiles')
        .update({
          role: target.role,
          require_password_change: false,
          full_name: target.fullName,
        })
        .eq('id', user.id)
      if (profileErr) {
        return { ok: false, message: profileErr.message }
      }
    }

    return {
      ok: true,
      users: TEST_USERS.map(({ role, email }) => ({ role, email })),
      passwordHint: TEST_PASSWORD,
    }
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : 'Could not prepare test users.',
    }
  }
}
