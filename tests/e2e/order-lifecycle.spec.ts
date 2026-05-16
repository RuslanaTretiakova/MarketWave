import { expect, test } from '@playwright/test'

import { getAdminClient } from './helpers/supabase'
import { OrderDetailPage } from './pages/OrderDetailPage'

/**
 * Creates a test order directly via the admin client for use in lifecycle tests.
 * In a real E2E suite this would go through the cart → checkout flow.
 */
async function seedOrder(status = 'new') {
  const db = getAdminClient()

  // Find the E2E client user
  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const clientUser = users?.users.find((u) => u.email === 'e2e.client@local.test')
  if (!clientUser) throw new Error('E2E client user not found — run global setup first')

  const { data: order, error } = await db
    .from('orders')
    .insert({
      user_id: clientUser.id,
      site_domain: 'e2e-active-site.com',
      price: 100,
      status,
      link_type: 'dofollow',
      publish_month: '2099-12-01',
    })
    .select('id')
    .single()

  if (error || !order) throw new Error(`Could not seed order: ${error?.message}`)
  return order.id as string
}

test.describe('Order lifecycle — admin/manager flow', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })

  test('admin can start a new order', async ({ page }) => {
    const orderId = await seedOrder('new')
    const detail = new OrderDetailPage(page)
    await detail.goto(orderId)
    await detail.clickAction(/start order|start/i)
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/in.?progress/i, { timeout: 8_000 })
  })

  test('admin can mark order as published', async ({ page }) => {
    const orderId = await seedOrder('content_approved')
    const detail = new OrderDetailPage(page)
    await detail.goto(orderId)
    await detail.clickAction(/publish|mark published/i)
    await detail.fillPublishedUrl('https://published-example.com/article')
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/published/i, { timeout: 8_000 })
  })

  test('admin can cancel a new order', async ({ page }) => {
    const orderId = await seedOrder('new')
    const detail = new OrderDetailPage(page)
    await detail.goto(orderId)
    await detail.clickAction(/cancel/i)
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/canceled/i, { timeout: 8_000 })
  })
})

test.describe('Order lifecycle — client content review', () => {
  test.use({ storageState: 'tests/.auth/client.json' })

  test('client can approve content', async ({ page }) => {
    const orderId = await seedOrder('content_sent')
    const detail = new OrderDetailPage(page)
    await detail.goto(orderId)
    await detail.clickAction(/approve/i)
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/approved/i, { timeout: 8_000 })
  })

  test('client can request changes', async ({ page }) => {
    const orderId = await seedOrder('content_sent')
    const detail = new OrderDetailPage(page)
    await detail.goto(orderId)
    await detail.clickAction(/request changes/i)
    await page.getByLabel(/comment|reason/i).fill('Please rewrite the intro.')
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/needs.?changes/i, { timeout: 8_000 })
  })
})
