import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))

import { createClient } from '@/lib/supabase/server'
import { clearCart, removeCartItem, updateCartItemDetails } from '@/lib/cart/cart-actions'

// Builds a chainable, thenable mock that mirrors the Supabase query builder
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
    'match',
  ].forEach((m) => {
    self[m] = vi.fn().mockReturnValue(self)
  })
  self.maybeSingle = vi.fn().mockResolvedValue(res)
  self.single = vi.fn().mockResolvedValue(res)
  // Make it awaitable directly (for delete/update without maybeSingle)
  self.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(res).then(resolve, reject)
  return self
}

function makeClient(opts: {
  user?: object | null
  authError?: object | null
  profileRole?: string
  tableResponses?: Record<string, { data: unknown; error: unknown }>
}) {
  const user = opts.user !== undefined ? opts.user : { id: 'user-1' }
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: opts.authError ?? null,
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({
          data: { role: opts.profileRole ?? 'client' },
          error: null,
        })
      }
      return makeChain(opts.tableResponses?.[table] ?? { data: null, error: null })
    }),
  }
}

const mockCreateClient = vi.mocked(createClient)

describe('removeCartItem', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when delete succeeds', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    expect(await removeCartItem('item-1')).toEqual({ ok: true })
  })

  it('returns error when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }) as never)
    const r = await removeCartItem('item-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/signed in/i)
  })

  it('returns error when profile role is not client', async () => {
    mockCreateClient.mockResolvedValue(makeClient({ profileRole: 'admin' }) as never)
    const r = await removeCartItem('item-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Only clients/i)
  })

  it('returns error when delete fails', async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({
        tableResponses: { cart_items: { data: null, error: { message: 'DB error' } } },
      }) as never
    )
    const r = await removeCartItem('item-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toBe('DB error')
  })
})

describe('updateCartItemDetails', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok for valid inputs', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    const r = await updateCartItemDetails({
      itemId: 'item-1',
      anchorText: 'buy now',
      targetUrl: 'https://example.com',
      publishMonth: '2099-06',
      clientNotes: 'some notes',
    })
    expect(r).toEqual({ ok: true })
  })

  it('rejects invalid publishMonth format', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    const r = await updateCartItemDetails({ itemId: 'item-1', publishMonth: 'june-2099' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/YYYY-MM/i)
  })

  it('rejects invalid targetUrl', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    const r = await updateCartItemDetails({ itemId: 'item-1', targetUrl: 'not-a-url' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/URL/i)
  })

  it('rejects ftp:// targetUrl', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    const r = await updateCartItemDetails({ itemId: 'item-1', targetUrl: 'ftp://example.com' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/http/i)
  })

  it('returns error when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }) as never)
    const r = await updateCartItemDetails({ itemId: 'item-1', anchorText: 'test' })
    expect(r.ok).toBe(false)
  })

  it('returns error when nothing to update', async () => {
    mockCreateClient.mockResolvedValue(makeClient({}) as never)
    const r = await updateCartItemDetails({ itemId: 'item-1' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Nothing to update/i)
  })
})

describe('clearCart', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns ok when cart exists and delete succeeds', async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({ tableResponses: { carts: { data: { id: 'cart-1' }, error: null } } }) as never
    )
    expect(await clearCart()).toEqual({ ok: true })
  })

  it('returns error when cart not found', async () => {
    mockCreateClient.mockResolvedValue(
      makeClient({ tableResponses: { carts: { data: null, error: null } } }) as never
    )
    const r = await clearCart()
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/Cart not found/i)
  })

  it('returns error when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeClient({ user: null }) as never)
    const r = await clearCart()
    expect(r.ok).toBe(false)
  })
})
