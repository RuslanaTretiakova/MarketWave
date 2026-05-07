'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']
type OrderStatus = Database['public']['Enums']['order_status']

async function getSessionContext(): Promise<
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string; role: UserRole }
  | { error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) return { error: 'You must be signed in.' }

  const { data: profile, error: profErr } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profErr || !profile) return { error: 'Profile not found.' }

  return { supabase, userId: user.id, role: profile.role }
}

function revalidateOrder(orderId: string) {
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

function mapPostgresError(msg: string): string {
  if (msg.includes('P0001') || msg.includes('Invalid order status transition')) {
    return 'This status transition is not allowed.'
  }
  return msg
}

async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  extraPatch?: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; message: string }> {
  const patch = { status, ...extraPatch }
  const { error } = await adminClient.from('orders').update(patch).eq('id', orderId)
  if (error)
    return { ok: false, message: mapPostgresError(error.message ?? 'Could not update order.') }
  return { ok: true }
}

export async function startOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin' && ctx.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can start orders.' }
  }

  const res = await updateOrderStatus(orderId, 'in_progress')
  if (res.ok) revalidateOrder(orderId)
  return res
}

export async function markContentSent(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'copywriter') {
    return { ok: false, message: 'Only copywriters can mark content as sent.' }
  }

  // Verify this copywriter is assigned to the order
  const { data: order, error: loadErr } = await adminClient
    .from('orders')
    .select('id, copywriter_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (loadErr || !order) return { ok: false, message: 'Order not found.' }
  if (order.copywriter_id !== ctx.userId) {
    return { ok: false, message: 'You are not assigned to this order.' }
  }
  if (order.status !== 'in_progress') {
    return { ok: false, message: 'Order must be in progress to mark content sent.' }
  }

  const res = await updateOrderStatus(orderId, 'content_sent')
  if (res.ok) revalidateOrder(orderId)
  return res
}

export async function approveContent(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'client') {
    return { ok: false, message: 'Only clients can approve content.' }
  }

  const { supabase } = ctx
  // Use createClient so RLS enforces the client only updates their own order
  const { error } = await supabase
    .from('orders')
    .update({ status: 'content_approved' })
    .eq('id', orderId)
    .eq('user_id', ctx.userId)

  if (error)
    return { ok: false, message: mapPostgresError(error.message ?? 'Could not approve content.') }

  revalidateOrder(orderId)
  return { ok: true }
}

export async function requestChanges(
  orderId: string,
  comment: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'client') {
    return { ok: false, message: 'Only clients can request changes.' }
  }

  const trimmedComment = comment.trim()
  if (!trimmedComment) return { ok: false, message: 'A comment is required.' }
  if (trimmedComment.length > 2000)
    return { ok: false, message: 'Comment must be 2000 characters or fewer.' }

  // Verify the client owns this order and it is in content_sent
  const { data: order, error: loadErr } = await adminClient
    .from('orders')
    .select('id, user_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (loadErr || !order) return { ok: false, message: 'Order not found.' }
  if (order.user_id !== ctx.userId) return { ok: false, message: 'Access denied.' }
  if (order.status !== 'content_sent') {
    return { ok: false, message: 'You can only request changes when content has been sent.' }
  }

  // Insert change request
  const { error: crErr } = await adminClient.from('change_requests').insert({
    order_id: orderId,
    user_id: ctx.userId,
    comment: trimmedComment,
    status: 'open',
  })

  if (crErr) return { ok: false, message: crErr.message ?? 'Could not submit change request.' }

  // Transition order to needs_changes
  const { error: statusErr } = await adminClient
    .from('orders')
    .update({ status: 'needs_changes' })
    .eq('id', orderId)

  if (statusErr)
    return {
      ok: false,
      message: mapPostgresError(statusErr.message ?? 'Could not update order status.'),
    }

  revalidateOrder(orderId)
  return { ok: true }
}

export async function resumeOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin' && ctx.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can resume orders.' }
  }

  const res = await updateOrderStatus(orderId, 'in_progress')
  if (res.ok) revalidateOrder(orderId)
  return res
}

export async function markPublished(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin' && ctx.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can mark orders as published.' }
  }

  const res = await updateOrderStatus(orderId, 'published')
  if (res.ok) revalidateOrder(orderId)
  return res
}

export async function cancelOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }

  if (ctx.role === 'client') {
    // Client can only cancel their own new orders via RLS
    const { supabase } = ctx
    const { error } = await supabase
      .from('orders')
      .update({ status: 'canceled' })
      .eq('id', orderId)
      .eq('user_id', ctx.userId)
      .eq('status', 'new')

    if (error)
      return { ok: false, message: mapPostgresError(error.message ?? 'Could not cancel order.') }
  } else if (ctx.role === 'admin' || ctx.role === 'manager') {
    const res = await updateOrderStatus(orderId, 'canceled')
    if (!res.ok) return res
  } else {
    return { ok: false, message: 'You cannot cancel orders.' }
  }

  revalidateOrder(orderId)
  return { ok: true }
}
