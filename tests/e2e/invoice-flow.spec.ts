import { expect, test } from '@playwright/test'

import { getAdminClient } from './helpers/supabase'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'

async function seedInvoiceForStatus(invoiceStatus: 'draft' | 'sent') {
  const db = getAdminClient()

  const { data: users } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const clientUser = users?.users.find((u) => u.email === 'e2e.client@local.test')
  if (!clientUser) throw new Error('E2E client user not found')

  // Insert a published order first
  const { data: order } = await db
    .from('orders')
    .insert({
      user_id: clientUser.id,
      site_domain: 'e2e-active-site.com',
      price: 100,
      status: 'published',
      link_type: 'dofollow',
      publish_month: '2099-12-01',
    })
    .select('id')
    .single()

  if (!order) throw new Error('Could not seed order for invoice test')

  // The invoice should be auto-created by DB trigger; if not, create manually
  const { data: invoice } = await db
    .from('invoices')
    .select('id')
    .eq('order_id', order.id)
    .maybeSingle()

  let invoiceId = invoice?.id as string | undefined

  if (!invoiceId) {
    const { data: newInv } = await db
      .from('invoices')
      .insert({
        client_id: clientUser.id,
        order_id: order.id,
        status: invoiceStatus,
        billing_month: '2099-12-01',
      })
      .select('id')
      .single()
    invoiceId = newInv?.id as string
  } else if (invoiceStatus === 'sent') {
    await db
      .from('invoices')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', invoiceId)
  }

  if (!invoiceId) throw new Error('Could not get invoice id')
  return invoiceId
}

test.describe('Invoice flow', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })

  test('admin can send a draft invoice', async ({ page }) => {
    const invoiceId = await seedInvoiceForStatus('draft')
    const detail = new InvoiceDetailPage(page)
    await detail.goto(invoiceId)
    await detail.clickSend()
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/sent/i, { timeout: 8_000 })
  })

  test('admin can mark sent invoice as paid', async ({ page }) => {
    const invoiceId = await seedInvoiceForStatus('sent')
    const detail = new InvoiceDetailPage(page)
    await detail.goto(invoiceId)
    await detail.clickMarkPaid()
    await detail.confirmDialog()
    await expect(detail.statusBadge()).toContainText(/paid/i, { timeout: 8_000 })
  })
})
