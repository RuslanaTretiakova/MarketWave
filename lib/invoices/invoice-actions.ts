'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; message: string }
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
  if (profile.role !== 'admin') return { ok: false, message: 'Only admins can manage invoices.' }

  return { ok: true, userId: user.id }
}

export async function markInvoicePaid(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid') return { ok: false, message: 'Invoice is already paid.' }
  if (invoice.status === 'canceled') return { ok: false, message: 'Cannot pay a canceled invoice.' }

  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not mark invoice as paid.' }

  revalidatePath('/orders')
  revalidatePath(`/orders/${invoice.order_id}`)
  return { ok: true }
}

export async function markInvoiceOverdue(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status !== 'pending')
    return { ok: false, message: 'Only pending invoices can be marked overdue.' }

  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'overdue' })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not update invoice.' }

  revalidatePath('/orders')
  revalidatePath(`/orders/${invoice.order_id}`)
  return { ok: true }
}

export async function cancelInvoice(
  invoiceId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireAdmin()
  if (!auth.ok) return auth

  const { data: invoice, error: loadErr } = await adminClient
    .from('invoices')
    .select('id, order_id, status')
    .eq('id', invoiceId)
    .maybeSingle()

  if (loadErr || !invoice) return { ok: false, message: loadErr?.message ?? 'Invoice not found.' }
  if (invoice.status === 'paid') return { ok: false, message: 'Cannot cancel a paid invoice.' }
  if (invoice.status === 'canceled') return { ok: false, message: 'Invoice is already canceled.' }

  const { error } = await adminClient
    .from('invoices')
    .update({ status: 'canceled' })
    .eq('id', invoiceId)

  if (error) return { ok: false, message: error.message ?? 'Could not cancel invoice.' }

  revalidatePath('/orders')
  revalidatePath(`/orders/${invoice.order_id}`)
  return { ok: true }
}
