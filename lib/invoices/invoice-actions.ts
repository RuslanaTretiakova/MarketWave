'use server'

import { revalidatePath } from 'next/cache'

import { createNotifications } from '@/lib/notifications/create-notification'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

async function requireInvoiceManager(): Promise<
  { ok: true; userId: string; role: UserRole } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can manage invoices.' }
  }

  return { ok: true, userId: user.id, role: profile.role }
}

function revalidateInvoice(invoiceId: string, orderId: string) {
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export async function markInvoicePaid(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status, order:orders!inner(status)')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid') return { ok: false, message: 'Invoice is already paid.' }
  if (invoice.order && invoice.order.status === 'canceled') {
    return { ok: false, message: 'Canceled orders cannot be marked as paid.' }
  }
  if (invoice.status !== 'sent') {
    return { ok: false, message: 'Only sent invoices can be marked as paid.' }
  }

  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not mark invoice as paid.' }

  // Notify the sourcer linked to the order's site
  const { data: orderWithSite } = await adminClient
    .from('orders')
    .select('site_id, site_domain, site:sites!inner(sourcer_id)')
    .eq('id', invoice.order_id)
    .maybeSingle()
  const sourcerId = (orderWithSite?.site as unknown as { sourcer_id: string | null })?.sourcer_id
  if (sourcerId) {
    void createNotifications({
      event: 'invoice_paid',
      title: 'Invoice paid',
      message: `The invoice for ${orderWithSite?.site_domain ?? 'an order'} has been marked as paid.`,
      recipientUserIds: [sourcerId],
      actorUserId: auth.userId,
      orderId: invoice.order_id,
      invoiceId,
    })
  }

  revalidateInvoice(invoiceId, invoice.order_id)
  revalidatePath('/notifications')
  return { ok: true }
}

export type UpdateInvoiceInput = {
  billing_month?: string | null
  due_date?: string | null
  items?: Array<{ id: string; amount: number }>
}

export async function updateInvoice(
  invoiceId: string,
  input: UpdateInvoiceInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const patch: { due_date?: string | null; billing_month?: string | null } = {}

  if (input.due_date !== undefined) {
    if (input.due_date === null || input.due_date === '') {
      patch.due_date = null
    } else {
      const dateStr = input.due_date.trim()
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return { ok: false, message: 'Due date must be a valid date (YYYY-MM-DD).' }
      }
      patch.due_date = dateStr
    }
  }
  if (input.billing_month !== undefined) {
    if (input.billing_month === null || input.billing_month === '') {
      patch.billing_month = null
    } else {
      const month = input.billing_month.trim()
      if (!/^\d{4}-\d{2}$/.test(month)) {
        return { ok: false, message: 'Billing month must use YYYY-MM format.' }
      }
      patch.billing_month = `${month}-01`
    }
  }

  if (input.items !== undefined) {
    if (!Array.isArray(input.items) || input.items.length === 0) {
      return { ok: false, message: 'Invoice must include at least one item.' }
    }
    for (const item of input.items) {
      if (!item.id) return { ok: false, message: 'Invoice item id is required.' }
      if (!Number.isFinite(item.amount) || item.amount < 0) {
        return { ok: false, message: 'Each item amount must be a non-negative number.' }
      }
    }
  }

  if (Object.keys(patch).length === 0 && input.items === undefined) {
    return { ok: false, message: 'Nothing to update.' }
  }

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status !== 'draft') {
    return { ok: false, message: 'Only draft invoices can be edited.' }
  }

  if (input.items && input.items.length > 0) {
    const ids = input.items.map((it) => it.id)
    const { data: existingItems, error: itemLoadErr } = await adminClient
      .from('invoice_items')
      .select('id')
      .eq('invoice_id', invoiceId)
      .in('id', ids)
    if (itemLoadErr)
      return { ok: false, message: itemLoadErr.message ?? 'Could not load invoice items.' }
    if ((existingItems ?? []).length !== ids.length) {
      return { ok: false, message: 'Some invoice items are invalid for this invoice.' }
    }

    for (const item of input.items) {
      const { error: itemErr } = await adminClient
        .from('invoice_items')
        .update({ amount: Math.round(item.amount * 100) / 100 })
        .eq('id', item.id)
        .eq('invoice_id', invoiceId)
      if (itemErr)
        return { ok: false, message: itemErr.message ?? 'Could not update invoice item.' }
    }
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await adminClient.from('invoices').update(patch).eq('id', invoiceId)
    if (error) return { ok: false, message: error.message ?? 'Could not update invoice.' }
  }

  revalidateInvoice(invoiceId, invoice.order_id)
  return { ok: true }
}

/**
 * "Send" stub: records `sent_at` so the UI can surface the timestamp. Wiring up an
 * actual transactional email provider (Resend, Postmark, Supabase Edge Function) is
 * a separate ops task — this action is intentionally infrastructure-agnostic.
 */
export async function sendInvoiceEmail(
  invoiceId: string
): Promise<{ ok: true; sentAt: string } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid') {
    return { ok: false, message: 'Paid invoices cannot be sent again.' }
  }
  if (invoice.status !== 'draft') {
    return { ok: false, message: 'Only draft invoices can be sent.' }
  }

  const sentAt = new Date().toISOString()
  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'sent', sent_at: sentAt })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not record send timestamp.' }

  revalidateInvoice(invoiceId, invoice.order_id)
  return { ok: true, sentAt }
}

export async function generateMonthlyInvoiceGroupsInternal(
  month: string
): Promise<{ ok: true; grouped: number } | { ok: false; message: string }> {
  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, message: 'Month must use YYYY-MM format.' }
  }
  const billingMonth = `${month}-01`

  const { data: invoices, error } = await adminClient
    .from('invoices')
    .select('id, order_id, status, order:orders!inner(user_id, status, publish_date)')
    .in('status', ['draft', 'sent'])
  if (error) return { ok: false, message: error.message ?? 'Could not load invoices.' }

  type InvoiceCandidate = {
    id: string
    order_id: string
    status: Database['public']['Enums']['invoice_status']
    order: {
      user_id: string
      status: Database['public']['Enums']['order_status']
      publish_date: string | null
    } | null
  }
  const rows = (invoices ?? []) as unknown as InvoiceCandidate[]

  const buckets = new Map<string, string[]>()
  for (const row of rows) {
    if (!row.order) continue
    if (row.order.status !== 'published' && row.order.status !== 'completed') continue
    const sourceMonth = (row.order.publish_date ?? billingMonth).slice(0, 7)
    if (sourceMonth !== month) continue
    const key = `${row.order.user_id}:${sourceMonth}`
    const list = buckets.get(key) ?? []
    list.push(row.id)
    buckets.set(key, list)
  }

  let grouped = 0
  for (const ids of buckets.values()) {
    const groupId = crypto.randomUUID()
    const { error: patchError } = await adminClient
      .from('invoices')
      .update({ billing_month: billingMonth, invoice_group_id: groupId })
      .in('id', ids)
    if (patchError) return { ok: false, message: patchError.message ?? 'Could not group invoices.' }
    grouped += ids.length
  }

  revalidatePath('/invoices')
  return { ok: true, grouped }
}

export async function generateMonthlyInvoiceGroups(
  month: string
): Promise<{ ok: true; grouped: number } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth
  return generateMonthlyInvoiceGroupsInternal(month)
}
