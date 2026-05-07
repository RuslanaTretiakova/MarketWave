'use server'

import { revalidatePath } from 'next/cache'

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
  const { supabase } = ctx

  // RLS ensures this only matches items in the current user's cart
  const { error } = await supabase.from('cart_items').delete().eq('id', itemId)

  if (error) return { ok: false, message: error.message ?? 'Could not remove item.' }

  revalidatePath('/cart')
  return { ok: true }
}

export async function updateCartItemPublishDate(
  itemId: string,
  publishDate: string | null
): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }
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

  if (error) return { ok: false, message: error.message ?? 'Could not update date.' }

  revalidatePath('/cart')
  return { ok: true }
}

export async function clearCart(): Promise<{ ok: true } | { ok: false; message: string }> {
  const ctx = await getClientSession()
  if ('error' in ctx) return { ok: false, message: ctx.error }
  const { supabase } = ctx

  const { data: cart, error: cartErr } = await supabase.from('carts').select('id').maybeSingle()

  if (cartErr || !cart) return { ok: false, message: cartErr?.message ?? 'Cart not found.' }

  const { error } = await supabase.from('cart_items').delete().eq('cart_id', cart.id)

  if (error) return { ok: false, message: error.message ?? 'Could not clear cart.' }

  revalidatePath('/cart')
  return { ok: true }
}
