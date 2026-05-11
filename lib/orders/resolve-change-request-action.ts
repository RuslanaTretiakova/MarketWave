'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function requireStaff(): Promise<
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
  if (profile.role !== 'admin' && profile.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can manage change requests.' }
  }

  return { ok: true, userId: user.id }
}

export async function resolveChangeRequest(
  changeRequestId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireStaff()
  if (!auth.ok) return auth

  const { data: cr, error: loadErr } = await adminClient
    .from('change_requests')
    .select('id, order_id, status')
    .eq('id', changeRequestId)
    .maybeSingle()

  if (loadErr || !cr) return { ok: false, message: loadErr?.message ?? 'Change request not found.' }
  if (cr.status !== 'open')
    return { ok: false, message: 'Only open change requests can be resolved.' }

  const trimmedReason = reason?.trim() ?? null
  if (trimmedReason && trimmedReason.length > 1000) {
    return { ok: false, message: 'Resolution reason must be 1000 characters or fewer.' }
  }

  const { error } = await adminClient
    .from('change_requests')
    .update({ status: 'resolved', resolution_reason: trimmedReason })
    .eq('id', changeRequestId)

  if (error) return { ok: false, message: error.message ?? 'Could not resolve change request.' }

  revalidatePath('/orders')
  revalidatePath(`/orders/${cr.order_id}`)
  return { ok: true }
}

export async function dismissChangeRequest(
  changeRequestId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const auth = await requireStaff()
  if (!auth.ok) return auth

  const { data: cr, error: loadErr } = await adminClient
    .from('change_requests')
    .select('id, order_id, status')
    .eq('id', changeRequestId)
    .maybeSingle()

  if (loadErr || !cr) return { ok: false, message: loadErr?.message ?? 'Change request not found.' }
  if (cr.status !== 'open')
    return { ok: false, message: 'Only open change requests can be dismissed.' }

  const trimmedReason = reason?.trim() ?? null
  if (trimmedReason && trimmedReason.length > 1000) {
    return { ok: false, message: 'Resolution reason must be 1000 characters or fewer.' }
  }

  const { error } = await adminClient
    .from('change_requests')
    .update({ status: 'dismissed', resolution_reason: trimmedReason })
    .eq('id', changeRequestId)

  if (error) return { ok: false, message: error.message ?? 'Could not dismiss change request.' }

  revalidatePath('/orders')
  revalidatePath(`/orders/${cr.order_id}`)
  return { ok: true }
}
