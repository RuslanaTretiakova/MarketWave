'use server'

import { revalidatePath } from 'next/cache'

import {
  CART_MUTATION_MAX_PER_KEY,
  CART_MUTATION_WINDOW_MS,
  checkAndRecordPublicRateLimit,
} from '@/lib/auth/public-rate-limit'
import { logDbError, mapDbError } from '@/lib/errors/map-db-error'
import { createClient } from '@/lib/supabase/server'

type SessionCtx =
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }
  | { error: string }

async function getClientSession(): Promise<SessionCtx> {
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
  if (profile.role !== 'client') return { error: 'Only clients use the cart.' }

  return { supabase, userId: user.id }
}

export async function removeCartItem(
  itemId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }

  const rl = await checkAndRecordPublicRateLimit({
    kind: 'cart_mutation',
    key: `uid:${ctx.userId}`,
    windowMs: CART_MUTATION_WINDOW_MS,
    max: CART_MUTATION_MAX_PER_KEY,
  })
  if (!rl.ok) return { ok: false, message: 'Too many requests. Slow down and try again.' }

  const { supabase } = ctx

  // RLS ensures this only matches items in the current user's cart
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId)

  if (error) {
    void logDbError({ context: 'cart/removeCartItem', error, userId: ctx.userId })
    return { ok: false, message: mapDbError(error).message }
  }

  revalidatePath('/cart')
  revalidatePath('/cart/checkout')
  revalidatePath('/sites')
  return { ok: true }
}

/** Remove the cart line for this site (client's cart only). */
export async function removeFromCartBySiteId(
  siteId: string
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = await createClient()

  const [{ data: authData, error: authErr }, { data: cart }, { data: profile }] = await Promise.all(
    [
      supabase.auth.getUser(),
      supabase.from('carts').select('id').maybeSingle(),
      supabase.from('profiles').select('role').maybeSingle(),
    ]
  )

  if (authErr || !authData.user) return { ok: false, message: 'You must be signed in.' }
  if (profile?.role !== 'client') return { ok: false, message: 'Only clients use the cart.' }
  if (!cart) return { ok: false, message: 'Cart not found.' }

  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('cart_id', cart.id)
    .eq('site_id', siteId)

  if (error) return { ok: false, message: mapDbError(error).message }

  revalidatePath('/cart')
  revalidatePath('/cart/checkout')
  revalidatePath('/sites')
  return { ok: true }
}

export async function updateCartItemPublishDate(
  itemId: string,
  publishDate: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }

  const rl = await checkAndRecordPublicRateLimit({
    kind: 'cart_mutation',
    key: `uid:${ctx.userId}`,
    windowMs: CART_MUTATION_WINDOW_MS,
    max: CART_MUTATION_MAX_PER_KEY,
  })
  if (!rl.ok) return { ok: false, message: 'Too many requests. Slow down and try again.' }

  const { supabase } = ctx

  if (publishDate !== null) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) {
      return { ok: false, message: 'Invalid date format. Use YYYY-MM-DD.' }
    }
    const d = new Date(publishDate)
    if (isNaN(d.getTime())) {
      return { ok: false, message: 'Invalid date.' }
    }
  }

  const { error } = await supabase
    .from('cart_items')
    .update({ publish_date: publishDate })
    .eq('id', itemId)

  if (error) {
    void logDbError({ context: 'cart/updatePublishDate', error, userId: ctx.userId })
    return { ok: false, message: mapDbError(error).message }
  }

  revalidatePath('/cart')
  return { ok: true }
}

type UpdateCartItemDetailsInput = {
  itemId: string
  publishMonth?: string | null
  anchorText?: string | null
  targetUrl?: string | null
  clientNotes?: string | null
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

export async function updateCartItemDetails(
  input: UpdateCartItemDetailsInput
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }

  const rl = await checkAndRecordPublicRateLimit({
    kind: 'cart_mutation',
    key: `uid:${ctx.userId}`,
    windowMs: CART_MUTATION_WINDOW_MS,
    max: CART_MUTATION_MAX_PER_KEY,
  })
  if (!rl.ok) return { ok: false, message: 'Too many requests. Slow down and try again.' }

  const { supabase } = ctx

  const patch: {
    publish_month?: string | null
    anchor_text?: string | null
    target_url?: string | null
    client_notes?: string | null
  } = {}

  if (input.publishMonth !== undefined) {
    if (input.publishMonth === null || input.publishMonth === '') {
      patch.publish_month = null
    } else if (!/^\d{4}-\d{2}$/.test(input.publishMonth)) {
      return { ok: false, message: 'Publication month must use YYYY-MM format.' }
    } else {
      patch.publish_month = `${input.publishMonth}-01`
    }
  }

  const normalizedUrl = normalizeOptionalUrl(input.targetUrl)
  if (!normalizedUrl.ok) return normalizedUrl

  if (input.anchorText !== undefined)
    patch.anchor_text = normalizeOptionalText(input.anchorText, 500)
  if (input.targetUrl !== undefined) patch.target_url = normalizedUrl.url
  if (input.clientNotes !== undefined)
    patch.client_notes = normalizeOptionalText(input.clientNotes, 4000)

  if (Object.keys(patch).length === 0) {
    return { ok: false, message: 'Nothing to update.' }
  }

  const { error } = await supabase.from('cart_items').update(patch).eq('id', input.itemId)
  if (error) {
    void logDbError({ context: 'cart/updateDetails', error, userId: ctx.userId })
    return { ok: false, message: mapDbError(error).message }
  }

  revalidatePath('/cart')
  revalidatePath('/cart/checkout')
  return { ok: true }
}

export async function clearCart(): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  const { supabase } = ctx

  const { data: cart, error: cartErr } = await supabase.from('carts').select('id').maybeSingle()

  if (cartErr || !cart) return { ok: false, message: 'Cart not found.' }

  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id)

  if (error) {
    void logDbError({ context: 'cart/clearCart', error, userId: ctx.userId })
    return { ok: false, message: mapDbError(error).message }
  }

  revalidatePath('/cart')
  revalidatePath('/cart/checkout')
  revalidatePath('/sites')
  return { ok: true }
}
