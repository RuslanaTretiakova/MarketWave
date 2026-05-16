import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  adminClient: { from: vi.fn(), rpc: vi.fn() },
}))
vi.mock('@/lib/notifications/notify-order-event', () => ({
  notifyInvoiceEvent: vi.fn().mockResolvedValue(undefined),
}))

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import {
  editInvoiceOrders,
  generateMonthlyInvoices,
  markInvoicePaid,
  sendInvoice,
} from '@/lib/invoices/invoice-actions'

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

function makeServerClient(role: string) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles') {
        return makeChain({ data: { role, full_name: 'Test User' }, error: null })
      }
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
// sendInvoice
// ---------------------------------------------------------------------------
describe('sendInvoice', () => {
  it('sends a draft invoice and returns sentAt', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: {
        data: { id: 'inv-1', status: 'draft', invoice_number: 'INV-001' },
        error: null,
      },
    })
    const r = await sendInvoice('inv-1')
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.sentAt).toBeTruthy()
  })

  it('rejects non-staff user', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('client') as never)
    const r = await sendInvoice('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/admin.*manager/i)
  })

  it('rejects already-sent invoice', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: { data: { id: 'inv-1', status: 'sent', invoice_number: 'INV-001' }, error: null },
    })
    const r = await sendInvoice('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/draft/i)
  })

  it('rejects paid invoice', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: { data: { id: 'inv-1', status: 'paid', invoice_number: 'INV-001' }, error: null },
    })
    const r = await sendInvoice('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/again/i)
  })

  it('returns error when invoice not found', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({ invoices: { data: null, error: null } })
    const r = await sendInvoice('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/not found/i)
  })
})

// ---------------------------------------------------------------------------
// markInvoicePaid
// ---------------------------------------------------------------------------
describe('markInvoicePaid', () => {
  it('marks sent invoice as paid', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: { data: { id: 'inv-1', status: 'sent' }, error: null },
    })
    expect(await markInvoicePaid('inv-1')).toEqual({ ok: true })
  })

  it('rejects draft invoice', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: { data: { id: 'inv-1', status: 'draft' }, error: null },
    })
    const r = await markInvoicePaid('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/sent/i)
  })

  it('rejects already-paid invoice', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: { data: { id: 'inv-1', status: 'paid' }, error: null },
    })
    const r = await markInvoicePaid('inv-1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/already paid/i)
  })

  it('rejects non-staff', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('copywriter') as never)
    const r = await markInvoicePaid('inv-1')
    expect(r.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// editInvoiceOrders
// ---------------------------------------------------------------------------
describe('editInvoiceOrders', () => {
  it('rejects editing non-draft invoice', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: {
        data: { id: 'inv-1', status: 'sent', client_id: 'c1', billing_month: '2099-01-01' },
        error: null,
      },
    })
    const r = await editInvoiceOrders('inv-1', { notes: 'test' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/draft/i)
  })

  it('rejects invalid adjustments (non-finite)', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: {
        data: { id: 'inv-1', status: 'draft', client_id: 'c1', billing_month: '2099-01-01' },
        error: null,
      },
    })
    const r = await editInvoiceOrders('inv-1', { adjustments: NaN })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/valid number/i)
  })

  it('rejects invalid billing_month format', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    setupAdmin({
      invoices: {
        data: { id: 'inv-1', status: 'draft', client_id: 'c1', billing_month: '2099-01-01' },
        error: null,
      },
    })
    const r = await editInvoiceOrders('inv-1', { billing_month: 'jan-2099' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/YYYY-MM/i)
  })

  it('rejects adding order not belonging to invoice client', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    // invoice belongs to client-1, order belongs to client-2
    ;(adminClient.from as AnyFn as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'invoices') {
        return makeChain({
          data: {
            id: 'inv-1',
            status: 'draft',
            client_id: 'client-1',
            billing_month: '2099-01-01',
          },
          error: null,
        })
      }
      if (table === 'orders') {
        return makeChain({
          data: {
            id: 'order-x',
            user_id: 'client-2',
            status: 'published',
            site_domain: 'x.com',
            price: 100,
          },
          error: null,
        })
      }
      return makeChain()
    })
    const r = await editInvoiceOrders('inv-1', { addOrderIds: ['order-x'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/does not belong/i)
  })

  it('rejects adding non-published order', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    ;(adminClient.from as AnyFn as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'invoices') {
        return makeChain({
          data: {
            id: 'inv-1',
            status: 'draft',
            client_id: 'client-1',
            billing_month: '2099-01-01',
          },
          error: null,
        })
      }
      if (table === 'orders') {
        return makeChain({
          data: {
            id: 'order-x',
            user_id: 'client-1',
            status: 'in_progress',
            site_domain: 'x.com',
            price: 100,
          },
          error: null,
        })
      }
      return makeChain()
    })
    const r = await editInvoiceOrders('inv-1', { addOrderIds: ['order-x'] })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/published/i)
  })
})

// ---------------------------------------------------------------------------
// generateMonthlyInvoices
// ---------------------------------------------------------------------------
describe('generateMonthlyInvoices', () => {
  it('calls RPC and returns count', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    ;(adminClient.rpc as AnyFn as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: 3,
      error: null,
    })
    const r = await generateMonthlyInvoices('2099-01')
    expect(r.ok).toBe(true)
    if (r.ok) expect((r as { ok: true; count: number }).count).toBe(3)
  })

  it('rejects non-staff', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('client') as never)
    const r = await generateMonthlyInvoices('2099-01')
    expect(r.ok).toBe(false)
  })

  it('returns error when RPC fails', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient('admin') as never)
    ;(adminClient.rpc as AnyFn as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: null,
      error: { message: 'RPC failed' },
    })
    const r = await generateMonthlyInvoices('2099-01')
    expect(r.ok).toBe(false)
  })
})
