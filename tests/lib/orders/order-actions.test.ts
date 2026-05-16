import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  adminClient: { from: vi.fn(), auth: { admin: {} } },
}))
vi.mock('@/lib/notifications/notify-order-event', () => ({
  notifyOrderEvent: vi.fn().mockResolvedValue(undefined),
}))

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  approveContent,
  cancelOrder,
  deleteOrder,
  markPublished,
  overrideOrderStatus,
  requestChanges,
  startOrder,
  updateOrderFields,
} from '@/lib/orders/order-actions'

type AnyFn = (...args: unknown[]) => unknown

function makeChain(res: { data: unknown; error: unknown } = { data: null, error: null }) {
  const self: Record<string, unknown> = {}
  ;[
    'select',
    'insert',
    'update',
    'delete',
    'eq',
    'neq',
    'order',
    'limit',
    'in',
    'is',
    'or',
  ].forEach((m) => {
    self[m] = vi.fn().mockReturnValue(self)
  })
  self.maybeSingle = vi.fn().mockResolvedValue(res)
  self.single = vi.fn().mockResolvedValue(res)
  self.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(res).then(resolve, reject)
  return self
}

function makeServerClient(opts: { user?: object | null; profileRole?: string }) {
  const user = opts.user !== undefined ? opts.user : { id: 'user-1' }
  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({ data: { role: opts.profileRole ?? 'admin' }, error: null })
      }
      // For order-level RLS operations (approveContent, cancelOrder, overrideOrderStatus)
      return makeChain({ data: null, error: null })
    }),
  }
}

function setupAdmin(tableMap: Record<string, { data: unknown; error: unknown }> = {}) {
  ;(adminClient.from as AnyFn as ReturnType<typeof vi.fn>).mockImplementation((table: string) =>
    makeChain(tableMap[table] ?? { data: null, error: null })
  )
}

const mockCreateClient = vi.mocked(createClient)

beforeEach(() => {
  vi.clearAllMocks()
  setupAdmin()
})

// ---------------------------------------------------------------------------
// startOrder
// ---------------------------------------------------------------------------
describe('startOrder', () => {
  it('succeeds for admin', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    expect(await startOrder('order-1')).toEqual({ ok: true })
  })

  it('succeeds for manager', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'manager' }) as never)
    expect(await startOrder('order-1')).toEqual({ ok: true })
  })

  it('rejects client role', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await startOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/admin.*manager/i)
  })

  it('returns error when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ user: null }) as never)
    const r = await startOrder('order-1')
    expect(r.ok).toBe(false)
  })

  it('maps P0001 trigger error to friendly message', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({
      orders: { data: null, error: { message: 'P0001: Invalid order status transition' } },
    })
    const r = await startOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/not allowed/i)
  })
})

// ---------------------------------------------------------------------------
// cancelOrder
// ---------------------------------------------------------------------------
describe('cancelOrder', () => {
  it('client can cancel own new order (RLS path)', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await cancelOrder('order-1')
    expect(r.ok).toBe(true)
  })

  it('staff can cancel new order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: { status: 'new' }, error: null } })
    expect(await cancelOrder('order-1')).toEqual({ ok: true })
  })

  it('staff cannot cancel non-new order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: { status: 'in_progress' }, error: null } })
    const r = await cancelOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/still new/i)
  })

  it('blocks when order not found for staff', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: null, error: null } })
    const r = await cancelOrder('order-1')
    expect(r.ok).toBe(false)
  })

  it('blocks non-client/staff roles', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'copywriter' }) as never)
    const r = await cancelOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/cannot cancel/i)
  })
})

// ---------------------------------------------------------------------------
// approveContent
// ---------------------------------------------------------------------------
describe('approveContent', () => {
  it('client can approve (RLS enforces ownership)', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await approveContent('order-1')
    expect(r.ok).toBe(true)
  })

  it('non-client is rejected', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'manager' }) as never)
    const r = await approveContent('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Only clients/i)
  })
})

// ---------------------------------------------------------------------------
// requestChanges
// ---------------------------------------------------------------------------
describe('requestChanges', () => {
  it('client with valid comment on content_sent order succeeds', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    setupAdmin({
      orders: {
        data: {
          id: 'order-1',
          user_id: 'user-1',
          copywriter_id: null,
          status: 'content_sent',
          site_domain: 'example.com',
        },
        error: null,
      },
      change_requests: { data: null, error: null },
    })
    const r = await requestChanges('order-1', 'Please fix the intro.')
    expect(r.ok).toBe(true)
  })

  it('rejects empty comment', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await requestChanges('order-1', '   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/required/i)
  })

  it('rejects comment over 2000 chars', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await requestChanges('order-1', 'x'.repeat(2001))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/2000/i)
  })

  it('non-client is rejected', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await requestChanges('order-1', 'fix it')
    expect(r.ok).toBe(false)
  })

  it('rejects when order not in content_sent', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    setupAdmin({
      orders: {
        data: {
          id: 'order-1',
          user_id: 'user-1',
          copywriter_id: null,
          status: 'in_progress',
          site_domain: null,
        },
        error: null,
      },
    })
    const r = await requestChanges('order-1', 'fix it')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/content.*sent/i)
  })
})

// ---------------------------------------------------------------------------
// markPublished
// ---------------------------------------------------------------------------
describe('markPublished', () => {
  it('staff can mark published with valid URL', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await markPublished('order-1', 'https://example.com/post')
    expect(r.ok).toBe(true)
  })

  it('rejects empty URL', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await markPublished('order-1', '   ')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/required/i)
  })

  it('rejects non-http URL', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await markPublished('order-1', 'ftp://bad.com')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/http/i)
  })

  it('rejects invalid publish date format', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await markPublished('order-1', 'https://example.com', 'not-a-date')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/YYYY-MM-DD/i)
  })

  it('client is rejected', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    const r = await markPublished('order-1', 'https://example.com')
    expect(r.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// overrideOrderStatus
// ---------------------------------------------------------------------------
describe('overrideOrderStatus', () => {
  it('admin can override status', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    const r = await overrideOrderStatus('order-1', 'in_progress')
    expect(r.ok).toBe(true)
  })

  it('manager is blocked', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'manager' }) as never)
    const r = await overrideOrderStatus('order-1', 'in_progress')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/admin/i)
  })
})

// ---------------------------------------------------------------------------
// deleteOrder
// ---------------------------------------------------------------------------
describe('deleteOrder', () => {
  it('admin can delete new order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: { id: 'order-1', status: 'new' }, error: null } })
    expect(await deleteOrder('order-1')).toEqual({ ok: true })
  })

  it('admin can delete canceled order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: { id: 'order-1', status: 'canceled' }, error: null } })
    expect(await deleteOrder('order-1')).toEqual({ ok: true })
  })

  it('admin cannot delete in_progress order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({ orders: { data: { id: 'order-1', status: 'in_progress' }, error: null } })
    const r = await deleteOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/new or canceled/i)
  })

  it('manager is blocked', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'manager' }) as never)
    const r = await deleteOrder('order-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/admin/i)
  })
})

// ---------------------------------------------------------------------------
// updateOrderFields
// ---------------------------------------------------------------------------
describe('updateOrderFields', () => {
  it('client can update own new order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    setupAdmin({
      orders: { data: { id: 'order-1', user_id: 'user-1', status: 'new' }, error: null },
    })
    const r = await updateOrderFields({ orderId: 'order-1', anchorText: 'buy now' })
    expect(r.ok).toBe(true)
  })

  it('client cannot update non-own order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'client' }) as never)
    setupAdmin({
      orders: { data: { id: 'order-1', user_id: 'other-user', status: 'new' }, error: null },
    })
    const r = await updateOrderFields({ orderId: 'order-1', anchorText: 'buy now' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/cannot edit/i)
  })

  it('admin can update any order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({
      orders: { data: { id: 'order-1', user_id: 'other', status: 'published' }, error: null },
    })
    const r = await updateOrderFields({ orderId: 'order-1', anchorText: 'new text' })
    expect(r.ok).toBe(true)
  })

  it('rejects invalid targetUrl', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({
      orders: { data: { id: 'order-1', user_id: 'user-1', status: 'new' }, error: null },
    })
    const r = await updateOrderFields({ orderId: 'order-1', targetUrl: 'not-a-url' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/URL/i)
  })

  it('returns error when nothing to update', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ profileRole: 'admin' }) as never)
    setupAdmin({
      orders: { data: { id: 'order-1', user_id: 'user-1', status: 'new' }, error: null },
    })
    const r = await updateOrderFields({ orderId: 'order-1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Nothing to update/i)
  })
})
