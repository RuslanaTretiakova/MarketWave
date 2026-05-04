import type { User } from '@supabase/supabase-js'

import { adminClient } from '@/lib/supabase/admin'

function assertServiceRoleConfigured(): void {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set on the server. Admin user management needs the Supabase service role key to list Auth users.'
    )
  }
}

/** Paginates through all Auth users (Admin API). */
export async function listAllAuthUsers(): Promise<User[]> {
  assertServiceRoleConfigured()

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

/** Find a user by normalized email (lowercase) without loading the full org user list. */
export async function findAuthUserByEmailLower(emailLower: string): Promise<User | null> {
  assertServiceRoleConfigured()

  const perPage = 200
  let page = 1

  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) {
      throw error
    }
    const batch = data.users
    const match = batch.find((u) => u.email?.toLowerCase() === emailLower)
    if (match) return match
    if (batch.length < perPage) return null
    page += 1
  }
}
