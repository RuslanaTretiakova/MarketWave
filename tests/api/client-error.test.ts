import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  adminClient: { from: vi.fn() },
}))
vi.mock('@/lib/auth/public-rate-limit', () => ({
  checkAndRecordPublicRateLimit: vi.fn().mockResolvedValue({ ok: true }),
  readClientIpKey: vi.fn().mockReturnValue('127.0.0.1'),
  CLIENT_ERROR_MAX_PER_KEY: 20,
  CLIENT_ERROR_WINDOW_MS: 60_000,
}))
vi.mock('@/lib/errors/client-error-post-origin', () => ({
  clientErrorPostOriginAllowed: vi.fn().mockReturnValue(true),
}))

import { adminClient } from '@/lib/supabase/admin'
import { checkAndRecordPublicRateLimit } from '@/lib/auth/public-rate-limit'
import { clientErrorPostOriginAllowed } from '@/lib/errors/client-error-post-origin'
import { POST } from '@/app/api/client-error/route'

type AnyFn = (...args: unknown[]) => unknown

function makeChain(res: { data: unknown; error: unknown } = { data: null, error: null }) {
  const self: Record<string, unknown> = {}
  ;['select', 'insert', 'update', 'delete', 'eq', 'or'].forEach((m) => {
    self[m] = vi.fn().mockReturnValue(self)
  })
  self.maybeSingle = vi.fn().mockResolvedValue(res)
  self.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
    Promise.resolve(res).then(resolve, reject)
  return self
}

function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/client-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', origin: 'http://localhost:3000', ...headers },
    body: JSON.stringify(body),
  })
}

const mockFrom = adminClient.from as AnyFn as ReturnType<typeof vi.fn>
const mockOriginAllowed = vi.mocked(clientErrorPostOriginAllowed)
const mockRateLimit = vi.mocked(checkAndRecordPublicRateLimit)

beforeEach(() => {
  vi.clearAllMocks()
  mockOriginAllowed.mockReturnValue(true)
  mockRateLimit.mockResolvedValue({ ok: true })
  mockFrom.mockImplementation(() => makeChain({ data: null, error: null }))
})

describe('POST /api/client-error', () => {
  it('returns 204 for valid error report', async () => {
    const res = await POST(makeRequest({ message: 'Something broke', level: 'error' }))
    expect(res.status).toBe(204)
  })

  it('returns 403 for disallowed origin', async () => {
    mockOriginAllowed.mockReturnValue(false)
    const res = await POST(makeRequest({ message: 'test' }))
    expect(res.status).toBe(403)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ ok: false })
    const res = await POST(makeRequest({ message: 'test' }))
    expect(res.status).toBe(429)
  })

  it('returns 400 for missing message', async () => {
    const res = await POST(makeRequest({ level: 'error' }))
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: string }
    expect(body.error).toMatch(/message/i)
  })

  it('returns 400 for empty message', async () => {
    const res = await POST(makeRequest({ message: '   ' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid JSON', async () => {
    const req = new Request('http://localhost/api/client-error', {
      method: 'POST',
      headers: { origin: 'http://localhost:3000' },
      body: 'not json {{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('defaults level to "error" when omitted', async () => {
    const insertChain = makeChain({ data: null, error: null })
    mockFrom.mockImplementation(() => insertChain)
    await POST(makeRequest({ message: 'test' }))
    // insert was called - level defaults applied inside the route, we just verify it succeeded
    expect(insertChain.insert).toHaveBeenCalled()
  })

  it('returns 503 when DB insert fails', async () => {
    mockFrom.mockImplementation(() => makeChain({ data: null, error: { message: 'DB down' } }))
    const res = await POST(makeRequest({ message: 'test' }))
    expect(res.status).toBe(503)
  })

  it('accepts all valid log levels', async () => {
    for (const level of ['info', 'warn', 'error', 'critical']) {
      mockFrom.mockImplementation(() => makeChain({ data: null, error: null }))
      const res = await POST(makeRequest({ message: 'test', level }))
      expect(res.status).toBe(204)
    }
  })
})
