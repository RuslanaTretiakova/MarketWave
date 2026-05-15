'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notifyInvoiceEvent } from '@/lib/notifications/notify-order-event'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']

async function requireInvoiceManager(): Promise<
  | { ok: true; userId: string; role: UserRole; actorName: string | null }
  | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { ok: false, message: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { ok: false, message: 'Profile not found.' }
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can manage invoices.' }
  }

  return { ok: true, userId: user.id, role: profile.role, actorName: profile.full_name }
}

function revalidateInvoicePaths(invoiceId: string) {
  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}`)
  revalidatePath('/orders')
  revalidatePath('/notifications')
}

// ---------------------------------------------------------------------------
// sendInvoice — draft → sent
// ---------------------------------------------------------------------------

export async function sendInvoice(
  invoiceId: string
): Promise<{ ok: true; sentAt: string } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, status, invoice_number')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid')
    return { ok: false, message: 'Paid invoices cannot be sent again.' }
  if (invoice.status !== 'draft') return { ok: false, message: 'Only draft invoices can be sent.' }

  const sentAt = new Date().toISOString()
  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'sent', sent_at: sentAt, sent_by: auth.userId })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not send invoice.' }

  void notifyInvoiceEvent('invoice_sent', {
    invoiceId,
    actorUserId: auth.userId,
    actorName: auth.actorName,
  })

  revalidateInvoicePaths(invoiceId)
  return { ok: true, sentAt }
}

// Keep old export name for components that haven't been updated yet.
export const sendInvoiceEmail = sendInvoice

// ---------------------------------------------------------------------------
// markInvoicePaid — sent → paid
// ---------------------------------------------------------------------------

export async function markInvoicePaid(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid') return { ok: false, message: 'Invoice is already paid.' }
  if (invoice.status !== 'sent')
    return { ok: false, message: 'Only sent invoices can be marked as paid.' }

  const { error } = await adminClient
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by: auth.userId,
    })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not mark invoice as paid.' }

  void notifyInvoiceEvent('invoice_paid', {
    invoiceId,
    actorUserId: auth.userId,
    actorName: auth.actorName,
  })

  revalidateInvoicePaths(invoiceId)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// editInvoiceOrders — add/remove orders and adjust on a draft invoice
// ---------------------------------------------------------------------------

export type EditInvoiceOrdersInput = {
  addOrderIds?: string[]
  removeItemIds?: string[]
  adjustments?: number
  due_date?: string | null
  billing_month?: string | null
  notes?: string | null
}

export async function editInvoiceOrders(
  invoiceId: string,
  input: EditInvoiceOrdersInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, status, client_id, billing_month')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status !== 'draft')
    return { ok: false, message: 'Only draft invoices can be edited.' }

  // Remove items
  if (input.removeItemIds && input.removeItemIds.length > 0) {
    const { error } = await adminClient
      .from('invoice_items')
      .delete()
      .eq('invoice_id', invoiceId)
      .in('id', input.removeItemIds)
    if (error) return { ok: false, message: error.message ?? 'Could not remove invoice items.' }
  }

  // Add orders
  if (input.addOrderIds && input.addOrderIds.length > 0) {
    for (const orderId of input.addOrderIds) {
      const { data: order, error: oErr } = await adminClient
        .from('orders')
        .select('id, user_id, status, site_domain, price')
        .eq('id', orderId)
        .maybeSingle()
      if (oErr || !order) return { ok: false, message: `Order ${orderId} not found.` }
      if (order.user_id !== invoice.client_id) {
        return { ok: false, message: `Order ${orderId} does not belong to this invoice's client.` }
      }
      if (order.status !== 'published') {
        return { ok: false, message: `Order ${orderId} must be published to be invoiced.` }
      }

      const { error: iErr } = await adminClient.from('invoice_items').insert({
        invoice_id: invoiceId,
        order_id: orderId,
        site_domain: order.site_domain,
        amount: order.price,
      })
      if (iErr) {
        if (iErr.message?.includes('unique') || iErr.code === '23505') {
          return { ok: false, message: `Order ${orderId} is already on another invoice.` }
        }
        return { ok: false, message: iErr.message ?? 'Could not add order to invoice.' }
      }
    }
  }

  // Update invoice-level fields
  const patch: Record<string, unknown> = {}
  if (input.adjustments !== undefined) {
    if (!Number.isFinite(input.adjustments)) {
      return { ok: false, message: 'Adjustments must be a valid number.' }
    }
    patch.adjustments = Math.round(input.adjustments * 100) / 100
  }
  if (input.due_date !== undefined) {
    patch.due_date = input.due_date || null
  }
  if (input.billing_month !== undefined) {
    if (input.billing_month && !/^\d{4}-\d{2}$/.test(input.billing_month)) {
      return { ok: false, message: 'Billing month must use YYYY-MM format.' }
    }
    patch.billing_month = input.billing_month ? `${input.billing_month}-01` : null
  }
  if (input.notes !== undefined) {
    patch.notes = input.notes || null
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await adminClient.from('invoices').update(patch).eq('id', invoiceId)
    if (error) return { ok: false, message: error.message ?? 'Could not update invoice.' }
  }

  revalidateInvoicePaths(invoiceId)
  return { ok: true }
}

// Keep old name for backward compat with existing components.
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

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status !== 'draft')
    return { ok: false, message: 'Only draft invoices can be edited.' }

  if (input.items && input.items.length > 0) {
    for (const item of input.items) {
      if (!Number.isFinite(item.amount) || item.amount < 0) {
        return { ok: false, message: 'Each item amount must be a non-negative number.' }
      }
      const { error } = await adminClient
        .from('invoice_items')
        .update({ amount: Math.round(item.amount * 100) / 100 })
        .eq('id', item.id)
        .eq('invoice_id', invoiceId)
      if (error) return { ok: false, message: error.message ?? 'Could not update invoice item.' }
    }
  }

  const patch: Record<string, string | null> = {}
  if (input.due_date !== undefined) patch.due_date = input.due_date || null
  if (input.billing_month !== undefined) {
    patch.billing_month = input.billing_month ? `${input.billing_month}-01` : null
  }

  if (Object.keys(patch).length > 0) {
    const { error } = await adminClient.from('invoices').update(patch).eq('id', invoiceId)
    if (error) return { ok: false, message: error.message ?? 'Could not update invoice.' }
  }

  revalidateInvoicePaths(invoiceId)
  return { ok: true }
}

// ---------------------------------------------------------------------------
// generateMonthlyInvoices — manual trigger for admin/manager (calls DB fn)
// ---------------------------------------------------------------------------

export async function generateMonthlyInvoices(
  month: string
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  const auth = await requireInvoiceManager()
  if (!auth.ok) return auth

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { ok: false, message: 'Month must use YYYY-MM format.' }
  }

  const billingMonth = `${month}-01`
  const { data, error } = await adminClient.rpc('generate_monthly_invoices', {
    p_billing_month: billingMonth,
  })

  if (error) return { ok: false, message: error.message ?? 'Could not generate invoices.' }

  revalidatePath('/invoices')
  return { ok: true, count: (data as number) ?? 0 }
}

// Keep old export names used in generate-monthly-invoices.tsx
export async function generateMonthlyInvoiceGroups(
  month: string
): Promise<{ ok: true; grouped: number } | { ok: false; message: string }> {
  const res = await generateMonthlyInvoices(month)
  if (!res.ok) return res
  return { ok: true, grouped: res.count }
}
