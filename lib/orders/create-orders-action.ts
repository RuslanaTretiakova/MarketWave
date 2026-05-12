'use server'

import { revalidatePath } from 'next/cache'

import { inactiveSitesCheckoutErrorMessage } from '@/lib/cart/cart-site-availability'
import { CHECKOUT_CART_SITES_SELECT, fetchCartItemsForCheckout } from '@/lib/cart/load-cart'
import { validateCartPublishMonths } from '@/lib/cart/validate-publish-month'
import { logAuthError } from '@/lib/errors/log-auth-error'
import { createNotifications, getStaffUserIds } from '@/lib/notifications/create-notification'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type OrderInsert = Database['public']['Tables']['orders']['Insert']

type OrderCreateStage =
  | 'auth'
  | 'profile'
  | 'load_cart'
  | 'validate_sites'
  | 'insert_orders'
  | 'clear_cart'
  | 'unexpected'

function isOrdersInsertSchemaCacheAnchorText(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('schema cache') && m.includes('anchor_text')
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

async function logOrderCreateFailure(opts: {
  stage: OrderCreateStage
  message: string
  userId?: string | null
  payload?: Record<string, unknown>
}): Promise<void> {
  await logAuthError({
    level: opts.stage === 'clear_cart' ? 'warn' : 'error',
    context: 'orders/create',
    message: opts.message,
    userId: opts.userId ?? null,
    payload: {
      stage: opts.stage,
      ...(opts.payload ?? {}),
    },
  })
}

export async function createOrderFromCartItem(
  cartItemId: string
): Promise<{ ok: true; orderId: string } | { ok: false; message: string }> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    await logOrderCreateFailure({
      stage: 'auth',
      message: authErr?.message ?? 'Order creation failed: unauthenticated request.',
      payload: { hasAuthError: Boolean(authErr) },
    })
    return { ok: false, message: 'You must be signed in.' }
  }

  try {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profErr || !profile) {
      await logOrderCreateFailure({
        stage: 'profile',
        message: profErr?.message ?? 'Order creation failed: missing profile.',
        userId: user.id,
      })
      return { ok: false, message: 'Profile not found.' }
    }
    if (profile.role !== 'client') return { ok: false, message: 'Only clients can place orders.' }

    const fullSelect = `id, site_id, publish_date, publish_month, anchor_text, target_url, client_notes, ${CHECKOUT_CART_SITES_SELECT}`
    const { data: row, error: itemErr } = await supabase
      .from('cart_items')
      .select(fullSelect)
      .eq('id', cartItemId)
      .maybeSingle()

    if (itemErr || !row) {
      await logOrderCreateFailure({
        stage: 'load_cart',
        message: itemErr?.message ?? 'Cart item not found.',
        userId: user.id,
        payload: { cartItemId },
      })
      return { ok: false, message: itemErr?.message ?? 'Cart item not found.' }
    }

    type RawItem = {
      id: string
      site_id: string
      publish_date: string | null
      publish_month: string | null
      anchor_text: string | null
      target_url: string | null
      client_notes: string | null
      sites: {
        id: string
        domain: string
        price: number
        dr: number | null
        status: Database['public']['Enums']['site_status']
        link_type: Database['public']['Enums']['link_type']
        requirements: string | null
        description: string | null
        contact_info: string | null
        keywords_relevance: string | null
        organic_keywords_count: number | null
        organic_traffic_count: number | null
        categories: { name: string } | null
        site_countries: { country: string }[]
        site_languages: { language: string }[]
      } | null
    }

    const item = row as unknown as RawItem
    const site = item.sites

    if (!site) {
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: 'Order creation blocked: cart item references a missing site.',
        userId: user.id,
        payload: { cartItemId },
      })
      return { ok: false, message: 'This site no longer exists.' }
    }

    if (site.status !== 'active') {
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: 'Order creation blocked: site is not active.',
        userId: user.id,
        payload: { cartItemId, siteStatus: site.status },
      })
      return {
        ok: false,
        message: inactiveSitesCheckoutErrorMessage(site.domain),
      }
    }

    const monthCheck = validateCartPublishMonths([item])
    if (!monthCheck.ok) {
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: monthCheck.message,
        userId: user.id,
      })
      return { ok: false, message: monthCheck.message }
    }

    const orderInsert: OrderInsert = {
      user_id: user.id,
      site_id: site.id,
      price: site.price,
      publish_date: item.publish_date ?? null,
      publish_month: item.publish_month ?? null,
      anchor_text: item.anchor_text ?? null,
      target_url: item.target_url ?? null,
      client_notes: item.client_notes ?? null,
      status: 'new',
      site_domain: site.domain,
      site_dr: site.dr,
      site_category: site.categories?.name ?? '',
      site_countries: site.site_countries.map((r) => r.country),
      site_languages: site.site_languages.map((r) => r.language),
      site_link_type: site.link_type,
      site_requirements: site.requirements,
      site_description: site.description,
      site_contact_info: site.contact_info,
      site_keywords_relevance: site.keywords_relevance,
      site_organic_keywords_count: site.organic_keywords_count,
      site_organic_traffic_count: site.organic_traffic_count,
    }

    let { data: inserted, error: insertErr } = await adminClient
      .from('orders')
      .insert([orderInsert])
      .select('id')
      .single()

    if (insertErr && isOrdersInsertSchemaCacheAnchorText(insertErr.message ?? '')) {
      await sleep(400)
      const retry = await adminClient.from('orders').insert([orderInsert]).select('id').single()
      inserted = retry.data
      insertErr = retry.error
    }

    if (insertErr || !inserted) {
      await logOrderCreateFailure({
        stage: 'insert_orders',
        message: insertErr?.message ?? 'Order creation failed during insert.',
        userId: user.id,
        payload: { cartItemId },
      })
      return { ok: false, message: insertErr?.message ?? 'Could not create order.' }
    }

    const { error: deleteErr } = await adminClient.from('cart_items').delete().eq('id', cartItemId)
    if (deleteErr) {
      await logOrderCreateFailure({
        stage: 'clear_cart',
        message: deleteErr.message ?? 'Order created but cart item removal failed.',
        userId: user.id,
        payload: { cartItemId, orderId: inserted.id },
      })
    }

    const staffIds = await getStaffUserIds()
    void createNotifications({
      event: 'order_created',
      title: 'New order placed',
      message: `A client placed an order for ${orderInsert.site_domain}.`,
      recipientUserIds: staffIds,
      actorUserId: user.id,
      orderId: inserted.id,
    })

    revalidatePath('/cart')
    revalidatePath('/orders')
    revalidatePath('/sites')
    revalidatePath('/notifications')
    return { ok: true, orderId: inserted.id }
  } catch (error) {
    await logOrderCreateFailure({
      stage: 'unexpected',
      message: error instanceof Error ? error.message : 'Unknown order creation error.',
      userId: user.id,
    })
    return { ok: false, message: 'Could not create order right now. Please try again.' }
  }
}

export async function createOrdersFromCart(): Promise<
  { ok: true; orderIds: string[] } | { ok: false; message: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    await logOrderCreateFailure({
      stage: 'auth',
      message: authErr?.message ?? 'Order creation failed: unauthenticated request.',
      payload: { hasAuthError: Boolean(authErr) },
    })
    return { ok: false, message: 'You must be signed in.' }
  }

  try {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()
    if (profErr || !profile) {
      await logOrderCreateFailure({
        stage: 'profile',
        message: profErr?.message ?? 'Order creation failed: missing profile.',
        userId: user.id,
      })
      return { ok: false, message: 'Profile not found.' }
    }
    if (profile.role !== 'client') return { ok: false, message: 'Only clients can place orders.' }

    const { data: cartItems, error: cartErr } = await fetchCartItemsForCheckout(supabase)

    if (cartErr) {
      await logOrderCreateFailure({
        stage: 'load_cart',
        message: cartErr.message ?? 'Order creation failed while loading cart.',
        userId: user.id,
      })
      return { ok: false, message: cartErr.message ?? 'Could not load cart.' }
    }
    if (!cartItems || cartItems.length === 0) return { ok: false, message: 'Your cart is empty.' }

    type RawItem = {
      id: string
      site_id: string
      publish_date: string | null
      publish_month: string | null
      anchor_text: string | null
      target_url: string | null
      client_notes: string | null
      sites: {
        id: string
        domain: string
        price: number
        dr: number | null
        status: Database['public']['Enums']['site_status']
        link_type: Database['public']['Enums']['link_type']
        requirements: string | null
        description: string | null
        contact_info: string | null
        keywords_relevance: string | null
        organic_keywords_count: number | null
        organic_traffic_count: number | null
        categories: { name: string } | null
        site_countries: { country: string }[]
        site_languages: { language: string }[]
      } | null
    }

    const items = cartItems as RawItem[]

    // Validate all sites are still active
    const inactiveItems = items.filter((item) => item.sites?.status !== 'active')
    if (inactiveItems.length > 0) {
      const domains = inactiveItems.map((item) => item.sites?.domain ?? 'unknown').join(', ')
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: 'Order creation blocked: cart contains inactive sites.',
        userId: user.id,
        payload: { inactiveSiteCount: inactiveItems.length },
      })
      return {
        ok: false,
        message: inactiveSitesCheckoutErrorMessage(domains),
      }
    }

    const missingItems = items.filter((item) => !item.sites)
    if (missingItems.length > 0) {
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: 'Order creation blocked: cart references missing sites.',
        userId: user.id,
        payload: { missingSiteCount: missingItems.length },
      })
      return { ok: false, message: 'Some cart items reference sites that no longer exist.' }
    }

    const monthCheck = validateCartPublishMonths(items)
    if (!monthCheck.ok) {
      await logOrderCreateFailure({
        stage: 'validate_sites',
        message: monthCheck.message,
        userId: user.id,
      })
      return { ok: false, message: monthCheck.message }
    }

    // Build order inserts (snapshot all site data at checkout time)
    const orderInserts: OrderInsert[] = items.map((item) => {
      const site = item.sites!
      return {
        user_id: user.id,
        site_id: site.id,
        price: site.price,
        publish_date: item.publish_date ?? null,
        publish_month: item.publish_month ?? null,
        anchor_text: item.anchor_text ?? null,
        target_url: item.target_url ?? null,
        client_notes: item.client_notes ?? null,
        status: 'new',
        site_domain: site.domain,
        site_dr: site.dr,
        site_category: site.categories?.name ?? '',
        site_countries: site.site_countries.map((r) => r.country),
        site_languages: site.site_languages.map((r) => r.language),
        site_link_type: site.link_type,
        site_requirements: site.requirements,
        site_description: site.description,
        site_contact_info: site.contact_info,
        site_keywords_relevance: site.keywords_relevance,
        site_organic_keywords_count: site.organic_keywords_count,
        site_organic_traffic_count: site.organic_traffic_count,
      }
    })

    // Insert orders using service role (clients have no direct INSERT policy)
    let { data: inserted, error: insertErr } = await adminClient
      .from('orders')
      .insert(orderInserts)
      .select('id')

    if (insertErr && isOrdersInsertSchemaCacheAnchorText(insertErr.message ?? '')) {
      await sleep(400)
      const retry = await adminClient.from('orders').insert(orderInserts).select('id')
      inserted = retry.data
      insertErr = retry.error
    }

    if (insertErr || !inserted) {
      await logOrderCreateFailure({
        stage: 'insert_orders',
        message: insertErr?.message ?? 'Order creation failed during insert.',
        userId: user.id,
        payload: { cartItemCount: items.length },
      })
      return { ok: false, message: insertErr?.message ?? 'Could not create orders.' }
    }

    const orderIds = inserted.map((o) => o.id)

    // Clear cart items (service role for clean delete across any state)
    const { data: cart } = await supabase.from('carts').select('id').maybeSingle()
    if (cart) {
      const { error: clearErr } = await adminClient
        .from('cart_items')
        .delete()
        .eq('cart_id', cart.id)
      if (clearErr) {
        await logOrderCreateFailure({
          stage: 'clear_cart',
          message: clearErr.message ?? 'Order created but cart cleanup failed.',
          userId: user.id,
          payload: { cartId: cart.id, orderIds },
        })
      }
    }

    // Notify admin/manager of new orders (fire-and-forget)
    const staffIds = await getStaffUserIds()
    for (let i = 0; i < orderInserts.length; i++) {
      void createNotifications({
        event: 'order_created',
        title: 'New order placed',
        message: `A client placed an order for ${orderInserts[i].site_domain}.`,
        recipientUserIds: staffIds,
        actorUserId: user.id,
        orderId: orderIds[i],
      })
    }

    revalidatePath('/cart')
    revalidatePath('/orders')
    revalidatePath('/sites')
    revalidatePath('/notifications')
    return { ok: true, orderIds }
  } catch (error) {
    await logOrderCreateFailure({
      stage: 'unexpected',
      message: error instanceof Error ? error.message : 'Unknown order creation error.',
      userId: user.id,
    })
    return { ok: false, message: 'Could not create orders right now. Please try again.' }
  }
}
