import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

export type CartItemRow = {
  id: string
  site_id: string
  publish_date: string | null
  created_at: string
  site_domain: string
  site_price: number
  site_dr: number | null
  site_category: string | null
  site_status: Database['public']['Enums']['site_status']
  site_link_type: Database['public']['Enums']['link_type']
}

type RawCartItem = {
  id: string
  site_id: string
  publish_date: string | null
  created_at: string
  sites: {
    id: string
    domain: string
    price: number
    dr: number | null
    status: Database['public']['Enums']['site_status']
    link_type: Database['public']['Enums']['link_type']
    categories: { name: string } | null
  } | null
}

function mapRow(raw: RawCartItem): CartItemRow {
  return {
    id: raw.id,
    site_id: raw.site_id,
    publish_date: raw.publish_date,
    created_at: raw.created_at,
    site_domain: raw.sites?.domain ?? '',
    site_price: raw.sites?.price ?? 0,
    site_dr: raw.sites?.dr ?? null,
    site_category: raw.sites?.categories?.name ?? null,
    site_status: raw.sites?.status ?? 'active',
    site_link_type: raw.sites?.link_type ?? 'dofollow',
  }
}

export async function loadCart(supabase: SupabaseClient<Database>): Promise<CartItemRow[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select(
      'id, site_id, publish_date, created_at, sites(id, domain, price, dr, status, link_type, categories(name))'
    )
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[cart/load]', error.message)
    throw new Error(error.message || 'Failed to load cart')
  }

  return ((data ?? []) as unknown as RawCartItem[]).map(mapRow)
}

export async function loadCartWithTotal(
  supabase: SupabaseClient<Database>
): Promise<{ items: CartItemRow[]; total: number }> {
  const items = await loadCart(supabase)
  const total = items.reduce((sum, item) => sum + item.site_price, 0)
  return { items, total }
}
