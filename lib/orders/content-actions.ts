'use server'

import { revalidatePath } from 'next/cache'

import {
  CONTENT_SAVE_MAX_PER_KEY,
  CONTENT_SAVE_WINDOW_MS,
  checkAndRecordPublicRateLimit,
} from '@/lib/auth/public-rate-limit'
import { withRollback } from '@/lib/db/with-rollback'
import { logDbError, mapDbError } from '@/lib/errors/map-db-error'
import { notifyOrderEvent } from '@/lib/notifications/notify-order-event'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { bodyHasContent, countWords, sanitizeContentHtml } from '@/lib/orders/sanitize-content-html'
import type { Database } from '@/lib/supabase/types'

type UserRole = Database['public']['Enums']['user_role']
type OrderStatus = Database['public']['Enums']['order_status']

const TITLE_MAX = 200
const META_MAX = 320
const BODY_MAX = 200_000

const COPYWRITER_EDITABLE_STATUSES: OrderStatus[] = ['in_progress', 'needs_changes']

type SessionContext = {
  userId: string
  role: UserRole
}

async function getSessionContext(): Promise<SessionContext | { error: string }> {
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

  return { userId: user.id, role: profile.role }
}

async function loadOrderForCopywriter(
  orderId: string,
  userId: string
): Promise<{ ok: true; status: OrderStatus } | { ok: false; message: string }> {
  const { data: order, error } = await adminClient
    .from('orders')
    .select('id, copywriter_id, status')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !order) return { ok: false, message: 'Order not found.' }
  if (order.copywriter_id !== userId) {
    return { ok: false, message: 'You are not assigned to this order.' }
  }
  if (!COPYWRITER_EDITABLE_STATUSES.includes(order.status)) {
    return {
      ok: false,
      message: 'Content can only be edited while the order is in progress or needs changes.',
    }
  }
  return { ok: true, status: order.status }
}

function revalidateOrder(orderId: string) {
  revalidatePath('/orders')
  revalidatePath(`/orders/${orderId}`)
}

export type SaveDraftInput = {
  title: string
  metaDescription: string
  bodyHtml: string
}

/**
 * Upsert the single draft row for an order. Idempotent: callers may invoke
 * this on every change (debounced) without spinning up new rows.
 */
export async function saveContentDraft(
  orderId: string,
  input: SaveDraftInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'copywriter') {
    return { ok: false, message: 'Only copywriters can save content drafts.' }
  }

  const rl = await checkAndRecordPublicRateLimit({
    kind: 'content_save',
    key: `uid:${ctx.userId}`,
    windowMs: CONTENT_SAVE_WINDOW_MS,
    max: CONTENT_SAVE_MAX_PER_KEY,
  })
  if (!rl.ok) return { ok: false, message: 'Saving too frequently. Wait a moment.' }

  const orderCheck = await loadOrderForCopywriter(orderId, ctx.userId)
  if (!orderCheck.ok) return orderCheck

  const title = input.title.trim().slice(0, TITLE_MAX)
  const metaDescription = input.metaDescription.trim().slice(0, META_MAX)
  const bodyHtml = sanitizeContentHtml(input.bodyHtml).slice(0, BODY_MAX)
  const word_count = countWords(bodyHtml)

  // Look up existing draft (one_draft_per_order partial unique index).
  const { data: existing, error: lookupErr } = await adminClient
    .from('order_content_versions')
    .select('id')
    .eq('order_id', orderId)
    .eq('status', 'draft')
    .maybeSingle()

  if (lookupErr) {
    console.error('[content-actions/saveDraft/lookup]', lookupErr.message)
    return { ok: false, message: 'Could not save draft.' }
  }

  if (existing) {
    const { error: updateErr } = await adminClient
      .from('order_content_versions')
      .update({
        title,
        meta_description: metaDescription,
        body_html: bodyHtml,
        word_count,
      })
      .eq('id', existing.id)
    if (updateErr) {
      console.error('[content-actions/saveDraft/update]', updateErr.message)
      return { ok: false, message: 'Could not save draft.' }
    }
  } else {
    const { error: insertErr } = await adminClient.from('order_content_versions').insert({
      order_id: orderId,
      copywriter_id: ctx.userId,
      status: 'draft',
      title,
      meta_description: metaDescription,
      body_html: bodyHtml,
      word_count,
    })
    if (insertErr) {
      console.error('[content-actions/saveDraft/insert]', insertErr.message)
      return { ok: false, message: 'Could not save draft.' }
    }
  }

  revalidateOrder(orderId)
  return { ok: true }
}

/**
 * Snapshot the current draft into a new immutable submitted version (numbered
 * sequentially per order) and transition the order to `content_sent`.
 * Allowed from both `in_progress` and `needs_changes`.
 */
export async function submitContent(
  orderId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getSessionContext()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  if (ctx.role !== 'copywriter') {
    return { ok: false, message: 'Only copywriters can submit content.' }
  }

  const orderCheck = await loadOrderForCopywriter(orderId, ctx.userId)
  if (!orderCheck.ok) return orderCheck

  const { data: draft, error: draftErr } = await adminClient
    .from('order_content_versions')
    .select('id, title, meta_description, body_html, word_count')
    .eq('order_id', orderId)
    .eq('status', 'draft')
    .maybeSingle()

  if (draftErr) {
    console.error('[content-actions/submit/lookup]', draftErr.message)
    return { ok: false, message: 'Could not load draft.' }
  }
  if (!draft) {
    return { ok: false, message: 'Save a draft before submitting for review.' }
  }
  if (!draft.title.trim()) {
    return { ok: false, message: 'Add a title before submitting.' }
  }
  if (!bodyHasContent(draft.body_html)) {
    return { ok: false, message: 'Add some body content before submitting.' }
  }

  // Compute next version_number (max+1) for this order.
  const { data: prior, error: priorErr } = await adminClient
    .from('order_content_versions')
    .select('version_number')
    .eq('order_id', orderId)
    .eq('status', 'submitted')
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (priorErr) {
    console.error('[content-actions/submit/prior]', priorErr.message)
    return { ok: false, message: 'Could not submit content.' }
  }
  const nextVersion = (prior?.version_number ?? 0) + 1

  // Insert submitted version + update order status atomically from the app's
  // perspective: if the status update fails, delete the submitted version so the
  // copywriter can retry without leaving a dangling submitted row.
  let submittedVersionId: string | null = null
  try {
    await withRollback(async () => {
      const { data: inserted, error: insertErr } = await adminClient
        .from('order_content_versions')
        .insert({
          order_id: orderId,
          copywriter_id: ctx.userId,
          status: 'submitted',
          version_number: nextVersion,
          title: draft.title,
          meta_description: draft.meta_description,
          body_html: draft.body_html,
          word_count: draft.word_count,
        })
        .select('id')
        .single()
      if (insertErr) {
        console.error('[content-actions/submit/insert]', insertErr.message)
        throw new Error('Could not submit content.')
      }
      submittedVersionId = inserted.id

      // Transition order status — DB trigger enforces valid transitions.
      const { error: statusErr } = await adminClient
        .from('orders')
        .update({ status: 'content_sent' })
        .eq('id', orderId)
      if (statusErr) {
        void logDbError({
          context: 'content/submitContent/status',
          error: statusErr,
          userId: ctx.userId,
        })
        throw new Error(
          mapDbError(statusErr, {
            trigger_exception: 'This status transition is not allowed.',
          }).message
        )
      }
    }, [
      async () => {
        if (submittedVersionId) {
          await adminClient.from('order_content_versions').delete().eq('id', submittedVersionId)
        }
      },
    ])
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Could not submit content.' }
  }

  // Best-effort: drop the draft so the editor starts clean for any next round.
  // If this fails the unique partial index will prevent a second draft anyway,
  // and the next saveContentDraft call will overwrite.
  const { error: deleteErr } = await adminClient
    .from('order_content_versions')
    .delete()
    .eq('id', draft.id)
  if (deleteErr) {
    console.error('[content-actions/submit/draft-delete]', deleteErr.message)
  }

  const { data: orderForNotif } = await adminClient
    .from('orders')
    .select('user_id, copywriter_id, site_domain')
    .eq('id', orderId)
    .maybeSingle()
  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('full_name')
    .eq('id', ctx.userId)
    .maybeSingle()
  void notifyOrderEvent('content_submitted', {
    orderId,
    actorUserId: ctx.userId,
    actorName: actorProfile?.full_name ?? null,
    order: {
      user_id: orderForNotif?.user_id ?? '',
      copywriter_id: orderForNotif?.copywriter_id ?? null,
      site_domain: orderForNotif?.site_domain ?? null,
    },
  })

  revalidateOrder(orderId)
  revalidatePath('/notifications')
  return { ok: true }
}
