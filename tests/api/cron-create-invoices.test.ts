import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: { rpc: vi.fn() },
}))

import { adminClient } from '@/lib/supabase/admin'
import { POST } from '@/app/api/cron/create-invoices/route'

type AnyFn = (...args: unknown[]) => unknown
const mockRpc = adminClient.rpc as AnyFn as ReturnType<typeof vi.fn>

function makeRequest(headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/cron/create-invoices', {
    method: 'POST',
    headers,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  mockRpc.mockResolvedValue({ data: 2, error: null })
})

describe('POST /api/cron/create-invoices', () => {
  it('returns 200 with count when header secret matches', async () => {
    const res = await POST(makeRequest({ 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean; billing_month: string; count: number }
    expect(body.ok).toBe(true)
    expect(body.count).toBe(2)
    expect(body.billing_month).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns 200 when using Bearer token', async () => {
    const res = await POST(makeRequest({ authorization: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
  })

  it('returns 401 when no secret provided', async () => {
    const res = await POST(makeRequest())
    expect(res.status).toBe(401)
  })

  it('returns 401 when wrong secret', async () => {
    const res = await POST(makeRequest({ 'x-cron-secret': 'wrong-secret' }))
    expect(res.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest({ 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when RPC fails', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC error' } })
    const res = await POST(makeRequest({ 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(500)
  })

  it('billing_month is the previous calendar month', async () => {
    const res = await POST(makeRequest({ 'x-cron-secret': 'test-secret' }))
    const body = (await res.json()) as { billing_month: string }
    const now = new Date()
    const expectedYear = now.getUTCMonth() === 0 ? now.getUTCFullYear() - 1 : now.getUTCFullYear()
    const expectedMonth = now.getUTCMonth() === 0 ? 12 : now.getUTCMonth()
    expect(
      body.billing_month.startsWith(`${expectedYear}-${String(expectedMonth).padStart(2, '0')}`)
    ).toBe(true)
  })
})
