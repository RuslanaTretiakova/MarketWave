'use server'

import { revalidatePath } from 'next/cache'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

type OrderInsert = Database['public']['Tables']['orders']['Insert']

export async function createOrdersFromCart(): Promise<
  { ok: true; orderIds: string[] } | { ok: false; message: string }
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
  if (profile.role !== 'client') return { ok: false, message: 'Only clients can place orders.' }

  // Load cart items with full site join
  const { data: cartItems, error: cartErr } = await supabase
    .from('cart_items')
    .select(
      'id, site_id, publish_date, sites(id, domain, price, dr, status, link_type, requirements, description, contact_info, keywords_relevance, organic_keywords_count, organic_traffic_count, categories(name), site_countries(country), site_languages(language))'
    )
    .order('created_at', { ascending: true })

  if (cartErr) return { ok: false, message: cartErr.message ?? 'Could not load cart.' }
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
    return {
      ok: false,
      message: `Some sites are no longer available: ${domains}. Please remove them from your cart.`,
    }
  }

  const missingItems = items.filter((item) => !item.sites)
  if (missingItems.length > 0) {
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
    return { ok: false, message: insertErr?.message ?? 'Could not create orders.' }
  }

  const orderIds = inserted.map((o) => o.id)

  // Clear cart items (service role for clean delete across any state)
  const { data: cart } = await supabase.from('carts').select('id').maybeSingle()
  if (cart) {
    await adminClient.from('cart_items').delete().eq('cart_id', cart.id)
  }

  revalidatePath('/cart')
  revalidatePath('/orders')
  return { ok: true, orderIds }
}
