import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/lib/supabase/types'

export type CartItemRow = {
  id: string
  site_id: string
  publish_date: string | null
  publish_month: string | null
  anchor_text: string | null
  target_url: string | null
  client_notes: string | null
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
  publish_month: string | null
  anchor_text: string | null
  target_url: string | null
  client_notes: string | null
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

/** Nested `sites(...)` projection used by checkout / order creation. */
export const CHECKOUT_CART_SITES_SELECT =
  'sites(id, domain, price, dr, status, link_type, requirements, description, contact_info, keywords_relevance, organic_keywords_count, organic_traffic_count, categories(name), site_countries(country), site_languages(language))'

const CART_PAGE_SITES_SELECT = 'sites(id, domain, price, dr, status, link_type, categories(name))'

function isMissingCartItemExtendedColumns(message: string): boolean {
  const markers = [
    'column cart_items.publish_month does not exist',
    'column cart_items.anchor_text does not exist',
    'column cart_items.target_url does not exist',
    'column cart_items.client_notes does not exist',
  ]
  return markers.some((m) => message.includes(m))
}

function patchLegacyCartExtendedFields(row: unknown): unknown {
  if (!row || typeof row !== 'object') return row
  return {
    ...row,
    publish_month: null,
    anchor_text: null,
    target_url: null,
    client_notes: null,
  }
}

function mapRow(raw: RawCartItem): CartItemRow {
  return {
    id: raw.id,
    site_id: raw.site_id,
    publish_date: raw.publish_date,
    publish_month: raw.publish_month,
    anchor_text: raw.anchor_text,
    target_url: raw.target_url,
    client_notes: raw.client_notes,
    created_at: raw.created_at,
    site_domain: raw.sites?.domain ?? '',
    site_price: raw.sites?.price ?? 0,
    site_dr: raw.sites?.dr ?? null,
    site_category: raw.sites?.categories?.name ?? null,
    site_status: raw.sites?.status ?? 'active',
    site_link_type: raw.sites?.link_type ?? 'dofollow',
  }
}

/**
 * Cart rows with the expanded site join used at checkout. Retries with a legacy
 * column list when `cart_items` predates billing/checkout columns.
 */
export async function fetchCartItemsForCheckout(supabase: SupabaseClient<Database>): Promise<{
  data: unknown[] | null
  error: { message: string } | null
}> {
  const fullSelect = `id, site_id, publish_date, publish_month, anchor_text, target_url, client_notes, ${CHECKOUT_CART_SITES_SELECT}`
  const legacySelect = `id, site_id, publish_date, ${CHECKOUT_CART_SITES_SELECT}`

  const first = await supabase
    .from('cart_items')
    .select(fullSelect)
    .order('created_at', { ascending: true })

  let error = first.error
  let rows: unknown[] | null = (first.data as unknown[] | null) ?? null

  if (error && isMissingCartItemExtendedColumns(error.message ?? '')) {
    const fb = await supabase
      .from('cart_items')
      .select(legacySelect)
      .order('created_at', { ascending: true })
    error = fb.error
    rows = fb.data ? (fb.data as unknown[]).map((r) => patchLegacyCartExtendedFields(r)) : null
  }

  return { data: rows, error }
}

export async function loadCart(supabase: SupabaseClient<Database>): Promise<CartItemRow[]> {
  const fullSelect = `id, site_id, publish_date, publish_month, anchor_text, target_url, client_notes, created_at, ${CART_PAGE_SITES_SELECT}`
  const legacySelect = `id, site_id, publish_date, created_at, ${CART_PAGE_SITES_SELECT}`

  const first = await supabase
    .from('cart_items')
    .select(fullSelect)
    .order('created_at', { ascending: true })

  let error = first.error
  let rows: unknown[] | null = (first.data as unknown[] | null) ?? null

  if (error && isMissingCartItemExtendedColumns(error.message ?? '')) {
    const fb = await supabase
      .from('cart_items')
      .select(legacySelect)
      .order('created_at', { ascending: true })
    error = fb.error
    rows = fb.data ? (fb.data as unknown[]).map((r) => patchLegacyCartExtendedFields(r)) : null
  }

  if (error) {
    console.error('[cart/load]', error.message)
    throw new Error(error.message || 'Failed to load cart')
  }

  return ((rows ?? []) as unknown as RawCartItem[]).map(mapRow)
}

export async function loadCartWithTotal(
  supabase: SupabaseClient<Database>
): Promise<{ items: CartItemRow[]; total: number }> {
  const items = await loadCart(supabase)
  const total = items.reduce((sum, item) => sum + item.site_price, 0)
  return { items, total }
}

/** Site IDs currently in the signed-in user's cart (empty if no cart). */
export async function loadCartSiteIds(supabase: SupabaseClient<Database>): Promise<string[]> {
  const { data } = await supabase.from('carts').select('cart_items(site_id)').maybeSingle()
  return ((data?.cart_items ?? []) as { site_id: string }[]).map((r) => r.site_id)
}
