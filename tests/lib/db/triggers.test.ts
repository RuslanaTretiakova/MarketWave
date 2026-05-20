/**
 * Integration tests for DB triggers.
 *
 * Requires a running local Supabase instance (Docker).
 * Skipped automatically when SUPABASE_SERVICE_ROLE_KEY is not set.
 *
 * Run with local Supabase up:
 *   npx supabase start
 *   npm test tests/lib/db/triggers.test.ts
 */

import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adminClient } from '@/lib/supabase/admin'

const hasLocalSupabase =
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  !!(process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)

describe.skipIf(!hasLocalSupabase)('DB triggers (integration)', () => {
  let testUserId: string
  let testActiveSiteId: string
  let testInactiveSiteId: string
  let testActiveSiteDomain: string

  // ── Shared setup ────────────────────────────────────────────────────────────

  beforeAll(async () => {
    const ts = Date.now()

    // Create auth user → triggers handle_new_user (profile) → triggers handle_new_profile (cart)
    const { data: userData, error: userErr } = await adminClient.auth.admin.createUser({
      email: `trigger-test-${ts}@local.test`,
      password: 'trigger-test-pw-123',
      email_confirm: true,
      user_metadata: { role: 'client', full_name: 'Trigger Test' },
    })
    if (userErr || !userData.user)
      throw new Error(`Could not create test user: ${userErr?.message}`)
    testUserId = userData.user.id

    await adminClient.from('profiles').update({ role: 'client' }).eq('id', testUserId)

    testActiveSiteDomain = `trigger-active-${ts}.test`
    const { data: activeSite, error: siteErr } = await adminClient
      .from('sites')
      .insert({
        domain: testActiveSiteDomain,
        status: 'active',
        price: 100,
        dr: 40,
        traffic: 1000,
        link_type: 'dofollow',
      })
      .select('id')
      .single()
    if (siteErr || !activeSite) throw new Error(`Could not create active site: ${siteErr?.message}`)
    testActiveSiteId = activeSite.id

    const { data: inactiveSite, error: inactiveErr } = await adminClient
      .from('sites')
      .insert({
        domain: `trigger-inactive-${ts}.test`,
        status: 'inactive',
        price: 100,
        dr: 40,
        traffic: 1000,
        link_type: 'dofollow',
      })
      .select('id')
      .single()
    if (inactiveErr || !inactiveSite)
      throw new Error(`Could not create inactive site: ${inactiveErr?.message}`)
    testInactiveSiteId = inactiveSite.id
  })

  afterAll(async () => {
    if (testUserId) {
      // invoices FK orders ON DELETE RESTRICT — delete invoices before orders
      const { data: orders } = await adminClient
        .from('orders')
        .select('id')
        .eq('user_id', testUserId)
      if (orders?.length) {
        await adminClient
          .from('invoices')
          .delete()
          .in(
            'order_id',
            orders.map((o) => o.id)
          )
        await adminClient.from('orders').delete().eq('user_id', testUserId)
      }
      await adminClient.auth.admin.deleteUser(testUserId)
    }
    if (testActiveSiteId) await adminClient.from('sites').delete().eq('id', testActiveSiteId)
    if (testInactiveSiteId) await adminClient.from('sites').delete().eq('id', testInactiveSiteId)
  })

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function insertOrder() {
    const { data, error } = await adminClient
      .from('orders')
      .insert({
        user_id: testUserId,
        site_id: testActiveSiteId,
        site_domain: testActiveSiteDomain,
        site_category: 'General',
        site_link_type: 'dofollow',
        price: 100,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`insertOrder failed: ${error?.message}`)
    return data.id as string
  }

  async function cleanupOrder(orderId: string) {
    await adminClient.from('invoices').delete().eq('order_id', orderId)
    await adminClient.from('orders').delete().eq('id', orderId)
  }

  // ── Test groups ──────────────────────────────────────────────────────────────

  describe('handle_new_user — profile auto-created on auth user insert', () => {
    it('profile row exists after createUser', async () => {
      const { data: profile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('id', testUserId)
        .maybeSingle()
      expect(profile).not.toBeNull()
    })
  })

  describe('handle_new_profile — cart auto-created on profile insert', () => {
    it('cart row exists after user creation', async () => {
      const { data: cart } = await adminClient
        .from('carts')
        .select('id')
        .eq('user_id', testUserId)
        .maybeSingle()
      expect(cart).not.toBeNull()
    })
  })

  describe('handle_new_order — invoice auto-created on order insert', () => {
    it('creates an invoice for the new order', async () => {
      const orderId = await insertOrder()
      try {
        const { data: invoice } = await adminClient
          .from('invoices')
          .select('id, amount')
          .eq('order_id', orderId)
          .maybeSingle()
        expect(invoice).not.toBeNull()
        expect(Number(invoice?.amount)).toBe(100)
      } finally {
        await cleanupOrder(orderId)
      }
    })
  })

  describe('enforce_order_status_transition', () => {
    it('allows new → in_progress', async () => {
      const orderId = await insertOrder()
      try {
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'in_progress' })
          .eq('id', orderId)
        expect(error).toBeNull()
      } finally {
        await cleanupOrder(orderId)
      }
    })

    it('allows new → canceled', async () => {
      const orderId = await insertOrder()
      try {
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'canceled' })
          .eq('id', orderId)
        expect(error).toBeNull()
      } finally {
        await cleanupOrder(orderId)
      }
    })

    it('rejects new → published with P0001', async () => {
      const orderId = await insertOrder()
      try {
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'published' })
          .eq('id', orderId)
        expect(error).not.toBeNull()
        expect(error?.code).toBe('P0001')
      } finally {
        await cleanupOrder(orderId)
      }
    })

    it('rejects new → completed with P0001', async () => {
      const orderId = await insertOrder()
      try {
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'completed' })
          .eq('id', orderId)
        expect(error).not.toBeNull()
        expect(error?.code).toBe('P0001')
      } finally {
        await cleanupOrder(orderId)
      }
    })

    it('allows in_progress → content_sent', async () => {
      const orderId = await insertOrder()
      try {
        await adminClient.from('orders').update({ status: 'in_progress' }).eq('id', orderId)
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'content_sent' })
          .eq('id', orderId)
        expect(error).toBeNull()
      } finally {
        await cleanupOrder(orderId)
      }
    })

    it('rejects in_progress → canceled with P0001', async () => {
      const orderId = await insertOrder()
      try {
        await adminClient.from('orders').update({ status: 'in_progress' }).eq('id', orderId)
        const { error } = await adminClient
          .from('orders')
          .update({ status: 'canceled' })
          .eq('id', orderId)
        expect(error).not.toBeNull()
        expect(error?.code).toBe('P0001')
      } finally {
        await cleanupOrder(orderId)
      }
    })
  })

  describe('check_site_active_before_cart_insert', () => {
    let testCartId: string

    beforeAll(async () => {
      const { data: cart } = await adminClient
        .from('carts')
        .select('id')
        .eq('user_id', testUserId)
        .maybeSingle()
      if (!cart) throw new Error('Cart not found for test user')
      testCartId = cart.id
    })

    it('rejects inactive site with P0001', async () => {
      const { error } = await adminClient
        .from('cart_items')
        .insert({ cart_id: testCartId, site_id: testInactiveSiteId })
      expect(error).not.toBeNull()
      expect(error?.code).toBe('P0001')
    })

    it('allows active site insert', async () => {
      const { error } = await adminClient
        .from('cart_items')
        .insert({ cart_id: testCartId, site_id: testActiveSiteId })
      expect(error).toBeNull()
      await adminClient
        .from('cart_items')
        .delete()
        .eq('cart_id', testCartId)
        .eq('site_id', testActiveSiteId)
    })

    it('rejects duplicate site in cart with 23505', async () => {
      await adminClient
        .from('cart_items')
        .insert({ cart_id: testCartId, site_id: testActiveSiteId })
      const { error } = await adminClient
        .from('cart_items')
        .insert({ cart_id: testCartId, site_id: testActiveSiteId })
      expect(error).not.toBeNull()
      expect(error?.code).toBe('23505')
      await adminClient
        .from('cart_items')
        .delete()
        .eq('cart_id', testCartId)
        .eq('site_id', testActiveSiteId)
    })
  })
})
