import { createClient } from '@supabase/supabase-js'

// Direct admin client for E2E seeding — uses service role key
export function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) {
    throw new Error('E2E: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export const TEST_PASSWORD = 'hello12345'

export const TEST_USERS = {
  admin: { email: 'e2e.admin@local.test', role: 'admin', fullName: 'E2E Admin' },
  manager: { email: 'e2e.manager@local.test', role: 'manager', fullName: 'E2E Manager' },
  client: { email: 'e2e.client@local.test', role: 'client', fullName: 'E2E Client' },
  copywriter: {
    email: 'e2e.copywriter@local.test',
    role: 'copywriter',
    fullName: 'E2E Copywriter',
  },
  sourcer: { email: 'e2e.sourcer@local.test', role: 'sourcer', fullName: 'E2E Sourcer' },
} as const

export type TestRole = keyof typeof TEST_USERS

/** Create or update a test user and ensure their profile has the right role. */
export async function upsertTestUser(role: TestRole) {
  const db = getAdminClient()
  const u = TEST_USERS[role]

  // List existing users to find by email
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const existing = list?.users.find((x) => x.email === u.email)

  let userId: string
  if (existing) {
    await db.auth.admin.updateUserById(existing.id, {
      password: TEST_PASSWORD,
      user_metadata: { role: u.role, full_name: u.fullName, is_bootstrap_admin: false },
    })
    userId = existing.id
  } else {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { role: u.role, full_name: u.fullName, is_bootstrap_admin: false },
    })
    if (error || !data.user)
      throw new Error(`Could not create ${role} test user: ${error?.message}`)
    userId = data.user.id
  }

  // Ensure profile matches
  await db
    .from('profiles')
    .update({
      role: u.role,
      require_password_change: false,
      full_name: u.fullName,
    })
    .eq('id', userId)

  return userId
}

/** Seed a test site and return its id. Idempotent by domain. */
export async function upsertTestSite(
  domain: string,
  status: 'active' | 'inactive' = 'active',
  sourcerId?: string
) {
  const db = getAdminClient()
  const { data: existing } = await db.from('sites').select('id').eq('domain', domain).maybeSingle()

  if (existing) {
    await db
      .from('sites')
      .update({ status, ...(sourcerId !== undefined ? { sourcer_id: sourcerId } : {}) })
      .eq('id', existing.id)
    return existing.id as string
  }

  const { data, error } = await db
    .from('sites')
    .insert({
      domain,
      status,
      price: 100,
      dr: 50,
      traffic: 5000,
      link_type: 'dofollow',
      ...(sourcerId !== undefined ? { sourcer_id: sourcerId } : {}),
    })
    .select('id')
    .single()

  if (error || !data) throw new Error(`Could not seed site ${domain}: ${error?.message}`)
  return data.id as string
}

/** Remove all E2E test users by email prefix. */
export async function cleanupTestUsers() {
  const db = getAdminClient()
  const { data: list } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const e2eUsers = list?.users.filter((u) => u.email?.endsWith('@local.test')) ?? []
  for (const u of e2eUsers) {
    await db.auth.admin.deleteUser(u.id)
  }
}
