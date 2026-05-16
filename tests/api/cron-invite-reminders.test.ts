import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/auth/invite-reminder-cron', () => ({
  runInviteReminderCronInternal: vi.fn(),
}))

import { runInviteReminderCronInternal } from '@/lib/auth/invite-reminder-cron'
import { GET, POST } from '@/app/api/cron/invite-reminders/route'

const mockCron = vi.mocked(runInviteReminderCronInternal)

function makeRequest(method: 'GET' | 'POST', headers: Record<string, string> = {}) {
  return new Request('http://localhost/api/cron/invite-reminders', { method, headers })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.CRON_SECRET = 'test-secret'
  mockCron.mockResolvedValue({ ok: true, sent: 3, skipped: 1, errors: 0, scanned: 10 })
})

describe('GET /api/cron/invite-reminders', () => {
  it('returns 200 with counts for valid Bearer token', async () => {
    const res = await GET(makeRequest('GET', { authorization: 'Bearer test-secret' }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      ok: boolean
      sent: number
      skipped: number
      errors: number
      scanned: number
    }
    expect(body.ok).toBe(true)
    expect(body.sent).toBe(3)
    expect(body.skipped).toBe(1)
    expect(body.scanned).toBe(10)
  })

  it('returns 401 for missing secret', async () => {
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns 401 for wrong secret', async () => {
    const res = await GET(makeRequest('GET', { 'x-cron-secret': 'bad' }))
    expect(res.status).toBe(401)
  })
})

describe('POST /api/cron/invite-reminders', () => {
  it('returns 200 with header secret', async () => {
    const res = await POST(makeRequest('POST', { 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(200)
  })

  it('returns 401 for missing secret', async () => {
    const res = await POST(makeRequest('POST'))
    expect(res.status).toBe(401)
  })

  it('returns 500 when CRON_SECRET not configured', async () => {
    delete process.env.CRON_SECRET
    const res = await POST(makeRequest('POST', { 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(500)
  })

  it('returns 500 when cron internal throws', async () => {
    mockCron.mockResolvedValue({ ok: false, message: 'Something failed' } as never)
    const res = await POST(makeRequest('POST', { 'x-cron-secret': 'test-secret' }))
    expect(res.status).toBe(500)
  })
})
