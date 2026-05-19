import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }))
vi.mock('@/lib/supabase/admin', () => ({
  adminClient: { from: vi.fn() },
}))

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { SiteListingPayload } from '@/lib/sites/site-actions'
import { updateSite } from '@/lib/sites/site-actions'

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

/**
 * Build a server-client mock.
 *
 * tableSequences: each table maps to an ordered list of responses. Calls are
 * served in order; the last entry is repeated once exhausted.
 * Profiles default to { role: profileRole } unless overridden via tableSequences.
 */
function makeServerClient(opts: {
  user?: object | null
  profileRole?: string
  tableSequences?: Record<string, Array<{ data: unknown; error: unknown }>>
  rpcResult?: { data: unknown; error: unknown }
}) {
  const user = opts.user !== undefined ? opts.user : { id: USER_ID }
  const counters: Record<string, number> = {}

  return {
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }) },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'profiles' && !opts.tableSequences?.profiles) {
        return makeChain({ data: { role: opts.profileRole ?? 'admin' }, error: null })
      }
      const seq = opts.tableSequences?.[table]
      if (seq?.length) {
        const idx = counters[table] ?? 0
        counters[table] = idx + 1
        return makeChain(seq[Math.min(idx, seq.length - 1)])
      }
      return makeChain({ data: null, error: null })
    }),
    rpc: vi.fn().mockResolvedValue(opts.rpcResult ?? { data: null, error: null }),
  }
}

const mockCreateClient = vi.mocked(createClient)

const USER_ID = 'user-1'
const SITE_ID = 'site-abc'

const BASE_PAYLOAD: SiteListingPayload = {
  domain: 'example.com',
  dr: 50,
  category_id: 1,
  price: 100,
  link_type: 'dofollow',
  requirements: '',
  description: '',
  sourcer_notes: '',
  contact_info: '',
  keywords_relevance: [],
  organic_keywords_count: 1000,
  organic_traffic_count: 5000,
  countries: ['US'],
  languages: ['en'],
  sourcer_id: '',
}

/** Standard happy-path table sequences for a given role. */
function happySequences(role: string, existingSourcerId: string | null = null) {
  return {
    categories: [{ data: { id: 1 }, error: null }],
    sites: [
      { data: { id: SITE_ID, sourcer_id: existingSourcerId, status: 'active' }, error: null },
      { data: null, error: null }, // no duplicate domain
      { data: null, error: null }, // update ok
    ],
    ...(role === 'sourcer' ? {} : {}),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  // Silence logSiteError inserts
  ;(adminClient.from as AnyFn as ReturnType<typeof vi.fn>).mockImplementation(() =>
    makeChain({ data: null, error: null })
  )
})

// ---------------------------------------------------------------------------
// auth
// ---------------------------------------------------------------------------
describe('updateSite — auth', () => {
  it('returns error when unauthenticated', async () => {
    mockCreateClient.mockResolvedValue(makeServerClient({ user: null }) as never)
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/signed in/i)
  })

  it('returns error when profile missing', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        tableSequences: { profiles: [{ data: null, error: null }] },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/profile not found/i)
  })
})

// ---------------------------------------------------------------------------
// validation (fast-exit before any DB table call)
// ---------------------------------------------------------------------------
describe('updateSite — validation', () => {
  beforeEach(() => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'sourcer',
        tableSequences: happySequences('sourcer', USER_ID),
      }) as never
    )
  })

  it('rejects empty domain', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, domain: '   ' })
    expect(r).toEqual({ ok: false, message: 'Domain is required.' })
  })

  it('rejects missing countries', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, countries: [] })
    expect(r).toEqual({ ok: false, message: 'Add at least one country.' })
  })

  it('rejects missing languages', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, languages: [] })
    expect(r).toEqual({ ok: false, message: 'Add at least one language.' })
  })

  it('rejects non-integer DR', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, dr: 50.5 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/DR/i)
  })

  it('rejects negative DR', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, dr: -1 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/DR/i)
  })

  it('rejects DR over 100', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, dr: 101 })
    expect(r).toEqual({ ok: false, message: 'DR cannot exceed 100.' })
  })

  it('rejects negative price', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, price: -10 })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/price/i)
  })

  it('rejects invalid category_id', async () => {
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, category_id: 0 })
    expect(r).toEqual({ ok: false, message: 'Pick a category.' })
  })
})

// ---------------------------------------------------------------------------
// DB checks
// ---------------------------------------------------------------------------
describe('updateSite — DB checks', () => {
  it('returns error when category not found', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: {
          categories: [{ data: null, error: null }],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'Category not found.' })
  })

  it('returns error when site not found', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [{ data: null, error: null }],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.message).toMatch(/site not found/i)
  })

  it('returns error for duplicate domain on another site', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: { id: 'other-site' }, error: null }, // duplicate found
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'A site with this domain already exists.' })
  })
})

// ---------------------------------------------------------------------------
// access control
// ---------------------------------------------------------------------------
describe('updateSite — access control', () => {
  it('sourcer can edit their own active site', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'sourcer',
        tableSequences: happySequences('sourcer', USER_ID),
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: true })
  })

  it("sourcer cannot edit another user's site", async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'sourcer',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: 'other-user', status: 'active' }, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'You cannot edit this site.' })
  })

  it('sourcer cannot edit an archived site', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'sourcer',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: USER_ID, status: 'archived' }, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'You cannot edit this site.' })
  })

  it('admin can edit any site', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: happySequences('admin'),
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: true })
  })

  it('client role is blocked', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'client',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'You cannot edit this site.' })
  })
})

// ---------------------------------------------------------------------------
// admin sourcer assignment
// ---------------------------------------------------------------------------
describe('updateSite — admin sourcer assignment', () => {
  it('admin can assign a valid sourcer', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        tableSequences: {
          profiles: [
            { data: { role: 'admin' }, error: null },
            { data: { id: 'sourcer-2', role: 'sourcer' }, error: null },
          ],
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: null, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, sourcer_id: 'sourcer-2' })
    expect(r).toEqual({ ok: true })
  })

  it('returns error for unknown sourcer id', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        tableSequences: {
          profiles: [
            { data: { role: 'admin' }, error: null },
            { data: null, error: null }, // sourcer not found
          ],
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, sourcer_id: 'nonexistent' })
    expect(r).toEqual({ ok: false, message: 'Assigned sourcer not found.' })
  })

  it('returns error when sourcer id belongs to non-sourcer role', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        tableSequences: {
          profiles: [
            { data: { role: 'admin' }, error: null },
            { data: { id: 'client-1', role: 'client' }, error: null },
          ],
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: null, error: null },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, { ...BASE_PAYLOAD, sourcer_id: 'client-1' })
    expect(r).toEqual({ ok: false, message: 'Assigned sourcer not found.' })
  })
})

// ---------------------------------------------------------------------------
// DB / RPC failures
// ---------------------------------------------------------------------------
describe('updateSite — DB and RPC failures', () => {
  it('returns error on update DB failure', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: {
          categories: [{ data: { id: 1 }, error: null }],
          sites: [
            { data: { id: SITE_ID, sourcer_id: null, status: 'active' }, error: null },
            { data: null, error: null },
            { data: null, error: { message: 'update failed' } },
          ],
        },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'update failed' })
  })

  it('returns error when RPC fails', async () => {
    mockCreateClient.mockResolvedValue(
      makeServerClient({
        profileRole: 'admin',
        tableSequences: happySequences('admin'),
        rpcResult: { data: null, error: { message: 'rpc error' } },
      }) as never
    )
    const r = await updateSite(SITE_ID, BASE_PAYLOAD)
    expect(r).toEqual({ ok: false, message: 'rpc error' })
  })
})
