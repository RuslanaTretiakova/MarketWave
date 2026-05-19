import type { SupabaseClient } from '@supabase/supabase-js'

import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { sanitizeIlikePattern } from '@/lib/pagination/sanitize-ilike'
import { quotePostgrestFilterValue } from '@/lib/supabase/postgrest-quote-filter-value'
import type { Database } from '@/lib/supabase/types'

export type SiteCatalogRow = {
  id: string
  domain: string
  dr: number | null
  price: number
  status: Database['public']['Enums']['site_status']
  link_type: Database['public']['Enums']['link_type']
  category_id: number
  category_name: string | null
  keywords_relevance: string | null
  description: string | null
  sourcer_id: string | null
  countries: string[]
  languages: string[]
}

export type SitesCatalogSearchParams = {
  page: number
  q: string
  categoryId?: number
  status?: Database['public']['Enums']['site_status']
  country?: string
  language?: string
  linkType?: Database['public']['Enums']['link_type']
  priceMin?: number
  priceMax?: number
  drMin?: number
  drMax?: number
}

type SitesJoinRow = {
  id: string
  domain: string
  dr: number | null
  price: number
  status: Database['public']['Enums']['site_status']
  link_type: Database['public']['Enums']['link_type']
  category_id: number
  keywords_relevance: string[] | null
  keywords_text: string | null
  description: string | null
  sourcer_id: string | null
  categories: { name: string } | null
  site_countries: { country: string }[] | null
  site_languages: { language: string }[] | null
}

function mapRow(raw: SitesJoinRow): SiteCatalogRow {
  const countries = [...new Set((raw.site_countries ?? []).map((r) => r.country))].sort()
  const languages = [...new Set((raw.site_languages ?? []).map((r) => r.language))].sort()
  return {
    id: raw.id,
    domain: raw.domain,
    dr: raw.dr,
    price: raw.price,
    status: raw.status,
    link_type: raw.link_type,
    category_id: raw.category_id,
    category_name: raw.categories?.name ?? null,
    keywords_relevance: raw.keywords_relevance?.join(', ') ?? null,
    description: raw.description,
    sourcer_id: raw.sourcer_id,
    countries,
    languages,
  }
}

/** Tokens shorter than this are ignored to avoid noisy single-character matches. */
const CATALOG_SEARCH_MIN_TOKEN_LEN = 2

/**
 * Whitespace-separated terms; each surviving token must match at least one of
 * domain, keywords, description, or category name (AND across tokens).
 */
function catalogSearchTokens(rawQ: string): string[] {
  const cleaned = sanitizeIlikePattern(rawQ)
  if (!cleaned) return []
  return cleaned
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= CATALOG_SEARCH_MIN_TOKEN_LEN)
}

function buildSelect(countryInner: boolean, langInner: boolean): string {
  const cc = countryInner ? 'site_countries!inner(country)' : 'site_countries(country)'
  const ll = langInner ? 'site_languages!inner(language)' : 'site_languages(language)'
  return [
    'id',
    'domain',
    'dr',
    'price',
    'status',
    'link_type',
    'category_id',
    'keywords_relevance',
    'keywords_text',
    'description',
    'sourcer_id',
    'categories(name)',
    cc,
    ll,
  ].join(',')
}

export async function loadSitesCatalogPage(
  supabase: SupabaseClient<Database>,
  params: SitesCatalogSearchParams
): Promise<{ rows: SiteCatalogRow[]; totalCount: number }> {
  const countryInner = Boolean(params.country?.trim())
  const langInner = Boolean(params.language?.trim())
  const select = buildSelect(countryInner, langInner)

  let page = Math.max(1, Math.floor(params.page) || 1)
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  let totalCount = 0
  let rows: SiteCatalogRow[] = []

  for (let attempt = 0; attempt < 2; attempt++) {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let q = supabase.from('sites').select(select, { count: 'exact' })

    const tokens = catalogSearchTokens(params.q)
    for (const token of tokens) {
      const pat = `%${token}%`
      const quoted = quotePostgrestFilterValue(pat)
      q = q.or(
        `domain.ilike.${quoted},keywords_text.ilike.${quoted},description.ilike.${quoted},categories.name.ilike.${quoted}`
      )
    }

    if (params.categoryId !== undefined && Number.isFinite(params.categoryId)) {
      q = q.eq('category_id', params.categoryId)
    }

    if (params.status) {
      q = q.eq('status', params.status)
    }

    if (params.country?.trim()) {
      q = q.eq('site_countries.country', params.country.trim().toUpperCase())
    }

    if (params.language?.trim()) {
      q = q.eq('site_languages.language', params.language.trim().toLowerCase())
    }

    if (params.linkType) {
      q = q.eq('link_type', params.linkType)
    }

    if (params.priceMin !== undefined && Number.isFinite(params.priceMin)) {
      q = q.gte('price', params.priceMin)
    }

    if (params.priceMax !== undefined && Number.isFinite(params.priceMax)) {
      q = q.lte('price', params.priceMax)
    }

    if (params.drMin !== undefined && Number.isFinite(params.drMin)) {
      q = q.gte('dr', params.drMin)
    }

    if (params.drMax !== undefined && Number.isFinite(params.drMax)) {
      q = q.lte('dr', params.drMax)
    }

    const { data, error, count } = await q.order('domain', { ascending: true }).range(from, to)

    if (error) {
      console.error('[sites/catalog]', error.message, error.code, error.details)
      throw new Error(error.message || 'Failed to load sites')
    }

    totalCount = count ?? 0
    const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
    if (page > totalPages) {
      page = totalPages
      continue
    }

    rows = ((data ?? []) as unknown as SitesJoinRow[]).map(mapRow)
    break
  }

  return { rows, totalCount }
}
