import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  adminClient: {
    from: vi.fn(),
    auth: { admin: { inviteUserByEmail: vi.fn() } },
  },
}))
vi.mock('@/lib/auth/admin-invite-rate-limit', () => ({
  checkAndRecordAdminInviteRateLimit: vi.fn().mockResolvedValue({ ok: true }),
}))
vi.mock('@/lib/auth/admin-auth-user-list', () => ({
  findAuthUserByEmailLower: vi.fn(),
}))
vi.mock('@/lib/auth/map-auth-error', () => ({
  mapAuthError: vi.fn().mockReturnValue({ message: 'Auth error', code: 'unknown' }),
}))
vi.mock('@/lib/errors/log-auth-error', () => ({
  logAuthError: vi.fn().mockResolvedValue(undefined),
}))
vi.mock('@/lib/auth/invite-email-redirect', () => ({
  getInviteEmailRedirectTo: vi.fn().mockReturnValue('https://app.example.com/auth/callback'),
}))
vi.mock('@/lib/site-url', () => ({
  productionServerEmailRedirectBlockedMessage: vi.fn().mockReturnValue(null),
}))

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { checkAndRecordAdminInviteRateLimit } from '@/lib/auth/admin-invite-rate-limit'
import { findAuthUserByEmailLower } from '@/lib/auth/admin-auth-user-list'
import { productionServerEmailRedirectBlockedMessage } from '@/lib/site-url'
import { inviteTeamMember, resendTeamInvite } from '@/lib/auth/invite-actions'

type AnyFn = (...args: unknown[]) => unknown

function makeChain(res: { data: unknown; error: unknown } = { data: null, error: null }) {
  const self: Record<string, unknown> = {}
  ;['select', 'insert', 'update', 'delete', 'eq', 'neq', 'order', 'limit', 'in', 'or'].forEach(
    (m) => {
      self[m] = vi.fn().mockReturnValue(self)
    }
  )
  self.maybeSingle = vi.fn().mockResolvedValue(res)
  self.single = vi.fn().mockResolvedValue(res)
  self.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(res).then(resolve, reject)
  return self
}

function makeServerClient(role: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'actor-1' } }, error: null }),
    },
    from: vi.fn().mockImplementation(() => makeChain({ data: { role }, error: null })),
  }
}

const mockCreateClient = vi.mocked(createClient)
const mockRateLimit = vi.mocked(checkAndRecordAdminInviteRateLimit)
const mockFindUser = vi.mocked(findAuthUserByEmailLower)
const mockRedirectBlock = vi.mocked(productionServerEmailRedirectBlockedMessage)
const mockInvite = adminClient.auth.admin.inviteUserByEmail as ReturnType<typeof vi.fn>
const mockAuditFrom = adminClient.from as AnyFn as ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.clearAllMocks()
  mockRateLimit.mockResolvedValue({ ok: true })
  mockRedirectBlock.mockReturnValue(null)
  mockInvite.mockResolvedValue({ error: null })
  mockAuditFrom.mockImplementation(() => makeChain({ data: null, error: null }))
})

// ---------------------------------------------------------------------------
// inviteTeamMember
// ---------------------------------------------------------------------------
describe('inviteTeamMember', () => {
  it('admin can invite a client', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    const r = await inviteTeamMember({ email: 'new@example.com', role: 'client' })
    expect(r.ok).toBe(true)
  })

  it('admin can invite a manager', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    const r = await inviteTeamMember({ email: 'mgr@example.com', role: 'manager' })
    expect(r.ok).toBe(true)
  })

  it('manager cannot invite another manager', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('manager') as never)
    const r = await inviteTeamMember({ email: 'mgr@example.com', role: 'manager' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Managers cannot invite/i)
  })

  it('client role is rejected by auth gate', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('client') as never)
    const r = await inviteTeamMember({ email: 'x@example.com', role: 'client' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/admin or manager/i)
  })

  it('rejects invalid email', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    const r = await inviteTeamMember({ email: 'notanemail', role: 'client' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/email/i)
  })

  it('rejects invalid role', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    const r = await inviteTeamMember({ email: 'x@example.com', role: 'superuser' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Invalid role/i)
  })

  it('blocks when rate limit hit', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockRateLimit.mockResolvedValue({ ok: false, message: 'Rate limited' })
    const r = await inviteTeamMember({ email: 'x@example.com', role: 'client' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Too many invites/i)
  })

  it('blocks when NEXT_PUBLIC_SITE_URL not configured', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockRedirectBlock.mockReturnValue('Site URL not configured.')
    const r = await inviteTeamMember({ email: 'x@example.com', role: 'client' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Site URL/i)
  })

  it('returns helpful message when email already registered', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockInvite.mockResolvedValue({ error: { message: 'User already registered' } })
    const r = await inviteTeamMember({ email: 'x@example.com', role: 'client' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/may already be registered/i)
  })
})

// ---------------------------------------------------------------------------
// resendTeamInvite
// ---------------------------------------------------------------------------
describe('resendTeamInvite', () => {
  it('resends invite when user has not signed in', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockFindUser.mockResolvedValue({
      id: 'user-x',
      last_sign_in_at: null,
      user_metadata: { role: 'client', full_name: null },
    } as never)
    mockAuditFrom.mockImplementation(() =>
      makeChain({ data: { require_password_change: false }, error: null })
    )
    const r = await resendTeamInvite({ email: 'invited@example.com' })
    expect(r.ok).toBe(true)
  })

  it('blocks resend when user has already signed in and no password change required', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockFindUser.mockResolvedValue({
      id: 'user-x',
      last_sign_in_at: '2025-01-01T00:00:00Z',
      user_metadata: { role: 'client', full_name: null },
    } as never)
    mockAuditFrom.mockImplementation(() =>
      makeChain({ data: { require_password_change: false }, error: null })
    )
    const r = await resendTeamInvite({ email: 'active@example.com' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/already signed in/i)
  })

  it('returns error when user not found', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    mockFindUser.mockResolvedValue(null)
    const r = await resendTeamInvite({ email: 'noone@example.com' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/No user found/i)
  })

  it('blocks non-staff', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('copywriter') as never)
    const r = await resendTeamInvite({ email: 'x@example.com' })
    expect(r.ok).toBe(false)
  })
})
