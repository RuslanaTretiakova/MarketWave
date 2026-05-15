import { notFound } from 'next/navigation'

import { SitesCatalog } from '@/components/sites/sites-catalog'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { isSitesCatalogFilterAbsent } from '@/lib/sites/sites-catalog-filter'
import { loadCartSiteIds } from '@/lib/cart/load-cart'
import { loadSitesCatalogPage } from '@/lib/sites/load-sites-catalog'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Sites',
}

type SiteStatus = Database['public']['Enums']['site_status']
type LinkType = Database['public']['Enums']['link_type']
const SUPPORTED_STATUS_FILTERS: SiteStatus[] = ['pending', 'needs_changes', 'active', 'archived']

type SearchParams = {
  page?: string | string[]
  q?: string | string[]
  category_id?: string | string[]
  status?: string | string[]
  country?: string | string[]
  language?: string | string[]
  link_type?: string | string[]
  price_min?: string | string[]
  price_max?: string | string[]
  dr_min?: string | string[]
  dr_max?: string | string[]
}

function parseSiteStatus(raw: string | undefined): SiteStatus | undefined {
  if (isSitesCatalogFilterAbsent(raw)) return undefined
  const value = raw!.trim() as SiteStatus
  return SUPPORTED_STATUS_FILTERS.includes(value) ? value : undefined
}

function parseLinkType(raw: string | undefined): LinkType | undefined {
  if (isSitesCatalogFilterAbsent(raw)) return undefined
  const t = raw!.trim()
  const allowed: LinkType[] = ['dofollow', 'nofollow', 'sponsored', 'ugc']
  return allowed.includes(t as LinkType) ? (t as LinkType) : undefined
}

export default async function SitesPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams

  const pageRaw = searchParamFirstString(sp.page)
  const qRaw = searchParamFirstString(sp.q)
  const categoryRaw = searchParamFirstString(sp.category_id)
  const statusRaw = searchParamFirstString(sp.status)
  const countryRaw = searchParamFirstString(sp.country)
  const languageRaw = searchParamFirstString(sp.language)
  const linkTypeRaw = searchParamFirstString(sp.link_type)
  const priceMinRaw = searchParamFirstString(sp.price_min)
  const priceMaxRaw = searchParamFirstString(sp.price_max)
  const drMinRaw = searchParamFirstString(sp.dr_min)
  const drMaxRaw = searchParamFirstString(sp.dr_max)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    notFound()
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile) {
    notFound()
  }

  const q = qRaw !== undefined ? qRaw.trim() : ''
  const pageParsed = Math.max(1, Math.floor(Number(pageRaw)) || 1)

  let categoryId: number | undefined
  if (categoryRaw !== undefined && !isSitesCatalogFilterAbsent(categoryRaw)) {
    const n = Number(categoryRaw.trim())
    if (Number.isFinite(n) && n > 0) categoryId = Math.floor(n)
  }

  const status = parseSiteStatus(statusRaw)
  const country = countryRaw?.trim() || undefined
  const language = languageRaw?.trim() || undefined
  const linkType = parseLinkType(linkTypeRaw)

  let priceMin: number | undefined
  if (priceMinRaw !== undefined && priceMinRaw.trim() !== '') {
    const n = Number(priceMinRaw)
    if (Number.isFinite(n)) priceMin = n
  }

  let priceMax: number | undefined
  if (priceMaxRaw !== undefined && priceMaxRaw.trim() !== '') {
    const n = Number(priceMaxRaw)
    if (Number.isFinite(n)) priceMax = n
  }

  let drMin: number | undefined
  if (drMinRaw !== undefined && drMinRaw.trim() !== '') {
    const n = Number(drMinRaw)
    if (Number.isFinite(n)) drMin = n
  }

  let drMax: number | undefined
  if (drMaxRaw !== undefined && drMaxRaw.trim() !== '') {
    const n = Number(drMaxRaw)
    if (Number.isFinite(n)) drMax = n
  }

  const [categoriesResult, cartSiteIds] = await Promise.all([
    supabase.from('categories').select('id, name').order('name', { ascending: true }),
    profile.role === 'client' ? loadCartSiteIds(supabase) : Promise.resolve([]),
  ])

  if (categoriesResult.error) {
    console.error('[sites] categories', categoriesResult.error.message)
    throw new Error(`Failed to load categories: ${categoriesResult.error.message}`)
  }

  const categories = categoriesResult.data ?? []

  let page = pageParsed
  let rows = [] as Awaited<ReturnType<typeof loadSitesCatalogPage>>['rows']
  let totalCount = 0

  for (let attempt = 0; attempt < 2; attempt++) {
    const result = await loadSitesCatalogPage(supabase, {
      page,
      q,
      categoryId,
      status,
      country,
      language,
      linkType,
      priceMin,
      priceMax,
      drMin,
      drMax,
    })
    totalCount = result.totalCount
    const totalPages = Math.max(1, Math.ceil(totalCount / SETTINGS_TABLE_PAGE_SIZE))
    if (page > totalPages) {
      page = totalPages
      continue
    }
    rows = result.rows
    break
  }

  return (
    <SitesCatalog
      role={profile.role}
      userId={user.id}
      rows={rows}
      totalCount={totalCount}
      page={page}
      q={q}
      categoryId={categoryId}
      status={status}
      country={country}
      language={language}
      linkType={linkType}
      priceMin={priceMin}
      priceMax={priceMax}
      drMin={drMin}
      drMax={drMax}
      categories={categories}
      cartSiteIds={cartSiteIds}
    />
  )
}
