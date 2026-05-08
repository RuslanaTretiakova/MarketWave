'use server'

import { revalidatePath } from 'next/cache'

import { logAuthError } from '@/lib/errors/log-auth-error'
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

    // Load cart items with full site join
    const { data: cartItems, error: cartErr } = await supabase
      .from('cart_items')
      .select(
        'id, site_id, publish_date, publish_month, anchor_text, target_url, client_notes, sites(id, domain, price, dr, status, link_type, requirements, description, contact_info, keywords_relevance, organic_keywords_count, organic_traffic_count, categories(name), site_countries(country), site_languages(language))'
      )
      .order('created_at', { ascending: true })

    if (cartErr) {
      await logOrderCreateFailure({
        stage: 'load_cart',
        message: cartErr.message ?? 'Order creation failed while loading cart.',
        userId: user.id,
      })
      return { ok: false, message: cartErr.message ?? 'Could not load cart.' }
    }
    if (!cartItems || cartItems.length === 0) return { ok: false, message: 'Your cart is empty.' }

    type RawItem = (typeof cartItems)[0] & {
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

    const items = cartItems as unknown as RawItem[]

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
        message: `Some sites are no longer available: ${domains}. Please remove them from your cart.`,
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
    const { data: inserted, error: insertErr } = await adminClient
      .from('orders')
      .insert(orderInserts)
      .select('id')

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

    revalidatePath('/cart')
    revalidatePath('/orders')
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
