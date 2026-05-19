'use server'

import { revalidatePath } from 'next/cache'

import { notifyOrderEvent } from '@/lib/notifications/notify-order-event'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']
type OrderStatus = Database['public']['Enums']['order_status']
type OrderUpdate = Database['public']['Tables']['orders']['Update']

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
  if (status === 'canceled') {
    const { data: invoice } = await adminClient
      .from('invoices')
      .select('status')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (invoice && invoice.status !== 'draft') {
      return { ok: false, message: 'Only orders with draft invoices can be canceled.' }
    }
  }

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

  const { data: orderData } = await adminClient
    .from('orders')
    .select('user_id, copywriter_id, site_domain')
    .eq('id', orderId)
    .maybeSingle()
  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .maybeSingle()
  void notifyOrderEvent('content_approved', {
    orderId,
    actorUserId: ctx.userId,
    actorName: actorProfile?.full_name ?? null,
    order: {
      user_id: orderData?.user_id ?? '',
      copywriter_id: orderData?.copywriter_id ?? null,
      site_domain: orderData?.site_domain ?? null,
    },
  })

  revalidateOrder(orderId)
  revalidatePath('/notifications')
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
    .select('id, user_id, copywriter_id, status, site_domain')
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

  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .maybeSingle()
  void notifyOrderEvent('changes_requested', {
    orderId,
    actorUserId: ctx.userId,
    actorName: actorProfile?.full_name ?? null,
    order: {
      user_id: order.user_id,
      copywriter_id: order.copywriter_id,
      site_domain: order.site_domain ?? null,
    },
  })

  revalidateOrder(orderId)
  revalidatePath('/notifications')
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

function normalizePublishedUrl(
  input: string
): { ok: true; url: string } | { ok: false; message: string } {
  const trimmed = input.trim()
  if (!trimmed) return { ok: false, message: 'A published URL is required.' }
  if (trimmed.length > 2048) return { ok: false, message: 'URL must be 2048 characters or fewer.' }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, message: 'Enter a valid URL including https://' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'URL must use http or https.' }
  }
  return { ok: true, url: parsed.toString() }
}

export async function markPublished(
  orderId: string,
  publishedUrl: string,
  publishDate?: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin' && ctx.role !== 'manager') {
    return { ok: false, message: 'Only admins and managers can mark orders as published.' }
  }

  const urlCheck = normalizePublishedUrl(publishedUrl)
  if (!urlCheck.ok) return urlCheck

  if (publishDate && !/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
    return { ok: false, message: 'Publish date must be a valid date (YYYY-MM-DD).' }
  }

  const extra: Record<string, unknown> = { published_url: urlCheck.url }
  if (publishDate !== undefined) {
    extra.publish_date = publishDate || null
  }

  const res = await updateOrderStatus(orderId, 'published', extra)
  if (res.ok) {
    const { data: orderData } = await adminClient
      .from('orders')
      .select('user_id, copywriter_id, site_domain')
      .eq('id', orderId)
      .maybeSingle()
    const { data: actorProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', ctx.userId)
      .maybeSingle()
    void notifyOrderEvent('order_published', {
      orderId,
      actorUserId: ctx.userId,
      actorName: actorProfile?.full_name ?? null,
      order: {
        user_id: orderData?.user_id ?? '',
        copywriter_id: orderData?.copywriter_id ?? null,
        site_domain: orderData?.site_domain ?? null,
      },
    })
    revalidateOrder(orderId)
    revalidatePath('/notifications')
  }
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
    const { data: order, error: loadErr } = await adminClient
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle()
    if (loadErr || !order) return { ok: false, message: 'Order not found.' }
    if (order.status !== 'new') {
      return { ok: false, message: 'Staff can only cancel orders that are still new.' }
    }

    const res = await updateOrderStatus(orderId, 'canceled')
    if (!res.ok) return res
  } else {
    return { ok: false, message: 'You cannot cancel orders.' }
  }

  revalidateOrder(orderId)
  return { ok: true }
}

function normalizeOptionalText(value: string | null | undefined, maxLen: number): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLen)
}

function normalizeOptionalUrl(
  input: string | null | undefined
): { ok: true; url: string | null } | { ok: false; message: string } {
  if (input === null || input === undefined) return { ok: true, url: null }
  const trimmed = input.trim()
  if (!trimmed) return { ok: true, url: null }
  if (trimmed.length > 2048) return { ok: false, message: 'URL must be 2048 characters or fewer.' }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, message: 'Enter a valid URL including https://' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, message: 'URL must use http or https.' }
  }
  return { ok: true, url: parsed.toString() }
}

export async function updateOrderFields(input: {
  orderId: string
  publishDate?: string | null
  publishMonth?: string | null
  anchorText?: string | null
  targetUrl?: string | null
  clientNotes?: string | null
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }

  const { data: order, error: loadErr } = await adminClient
    .from('orders')
    .select('id, user_id, status')
    .eq('id', input.orderId)
    .maybeSingle()
  if (loadErr || !order) return { ok: false, message: 'Order not found.' }

  const isOwnClientNew =
    ctx.role === 'client' && order.user_id === ctx.userId && order.status === 'new'
  const isAdmin = ctx.role === 'admin'
  if (!isOwnClientNew && !isAdmin) {
    return { ok: false, message: 'You cannot edit this order.' }
  }

  if (input.publishDate !== undefined && input.publishDate !== null && input.publishDate !== '') {
    const dateStr = input.publishDate.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return { ok: false, message: 'Publish date must be a valid date (YYYY-MM-DD).' }
    }
  }

  if (
    input.publishMonth !== undefined &&
    input.publishMonth !== null &&
    input.publishMonth !== ''
  ) {
    const monthStr = input.publishMonth.trim()
    if (!/^\d{4}-\d{2}$/.test(monthStr)) {
      return { ok: false, message: 'Publication month must be in YYYY-MM format.' }
    }
  }

  const url = normalizeOptionalUrl(input.targetUrl)
  if (!url.ok) return url

  const patch: OrderUpdate = {}
  if (input.publishDate !== undefined) {
    patch.publish_date = input.publishDate ? input.publishDate.trim() : null
  }
  if (input.publishMonth !== undefined) {
    patch.publish_month = input.publishMonth ? input.publishMonth.trim() : null
  }
  if (input.anchorText !== undefined)
    patch.anchor_text = normalizeOptionalText(input.anchorText, 500)
  if (input.targetUrl !== undefined) patch.target_url = url.url
  if (input.clientNotes !== undefined)
    patch.client_notes = normalizeOptionalText(input.clientNotes, 4000)

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: 'Nothing to update.' }
  }

  const { error } = await adminClient.from('orders').update(patch).eq('id', input.orderId)
  if (error) return { ok: false, message: error.message ?? 'Could not update order.' }

  revalidateOrder(input.orderId)
  return { ok: true }
}

export async function overrideOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin') {
    return { ok: false, message: 'Only admins can override order status.' }
  }

  const { supabase } = ctx
  const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
  if (error)
    return { ok: false, message: mapPostgresError(error.message ?? 'Could not update order.') }

  revalidateOrder(orderId)
  return { ok: true }
}

export async function deleteOrder(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'admin') {
    return { ok: false, message: 'Only admins can delete orders.' }
  }

  const { data: order, error: loadErr } = await adminClient
    .from('orders')
    .select('id, status')
    .eq('id', orderId)
    .maybeSingle()
  if (loadErr || !order) return { ok: false, message: 'Order not found.' }
  if (order.status !== 'new' && order.status !== 'canceled') {
    return { ok: false, message: 'Only new or canceled orders can be deleted.' }
  }

  const { error } = await adminClient.from('orders').delete().eq('id', orderId)
  if (error) return { ok: false, message: error.message ?? 'Could not delete order.' }

  revalidatePath('/orders')
  return { ok: true }
}
