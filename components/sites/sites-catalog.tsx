'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  Eye,
  Filter,
  Globe,
  Pencil,
  Plus,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'

import { SiteCatalogRowActions } from '@/components/sites/site-catalog-row-actions'
import { SiteChangeStatusDialog } from '@/components/sites/site-change-status-dialog'
import { SiteStatusBadge } from '@/components/sites/site-status-badge'
import { SettingsRightSheet } from '@/components/settings/settings-right-sheet'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import { FilterSelect } from '@/components/ui/filter-bar'
import { FormControlInput } from '@/components/ui/form-control'
import { PageHeader } from '@/components/ui/page-header'
import { SearchField } from '@/components/ui/search-field'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import { removeFromCartBySiteId } from '@/lib/cart/cart-actions'
import { siteAdminTransitions } from '@/lib/sites/admin-site-transitions'
import type { SiteCatalogRow } from '@/lib/sites/load-sites-catalog'
import { addSiteToCart } from '@/lib/sites/site-actions'
import { SITE_STATUS_LABEL, SITE_STATUSES_ORDERED } from '@/lib/sites/site-status-labels'
import {
  SITES_CATALOG_FILTER_SENTINEL,
  sitesCatalogQueryValueForUrl,
} from '@/lib/sites/sites-catalog-filter'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

export type SitesCatalogCategoryOption = { id: number; name: string }

type UserRole = Database['public']['Enums']['user_role']

const LINK_TYPES: Database['public']['Enums']['link_type'][] = [
  'dofollow',
  'nofollow',
  'sponsored',
  'ugc',
]

const SITE_ROW_CELL =
  'px-4 py-3 align-middle whitespace-normal transition-colors group-hover/site-row:bg-muted/50 group-has-[[aria-expanded=true]]/site-row:bg-muted/50'

const SITE_ROW_CELL_MUTED =
  'text-muted-foreground px-4 py-3 align-middle tabular-nums whitespace-normal transition-colors group-hover/site-row:bg-muted/50 group-has-[[aria-expanded=true]]/site-row:bg-muted/50'

const SITE_ROW_CELL_ACTIONS =
  'px-4 py-3 align-middle text-right whitespace-normal transition-colors group-hover/site-row:bg-muted/50 group-has-[[aria-expanded=true]]/site-row:bg-muted/50'

const SITES_FILTER_INPUT_DEBOUNCE_MS = 320

function TokenPill({ value, tone = 'neutral' }: { value: string; tone?: 'neutral' | 'warm' }) {
  return (
    <span
      className={cn(
        'inline-flex min-h-6 items-center rounded-full px-2 py-0.5 text-xs font-medium',
        tone === 'warm'
          ? 'bg-amber-500/12 text-amber-900 dark:text-amber-100'
          : 'bg-muted text-muted-foreground'
      )}
    >
      {value}
    </span>
  )
}

function ValuePillList({
  values,
  warm = false,
  max = 3,
}: {
  values: string[]
  warm?: boolean
  max?: number
}) {
  const shown = values.slice(0, max)
  const extra = Math.max(0, values.length - shown.length)
  if (values.length === 0) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  return (
    <div className="gap-inset flex flex-wrap">
      {shown.map((value) => (
        <TokenPill key={value} value={value} tone={warm ? 'warm' : 'neutral'} />
      ))}
      {extra > 0 ? <TokenPill value={`+${extra}`} /> : null}
    </div>
  )
}

type SitesCatalogBuildListHref = (
  nextPage: number,
  overrides?: {
    q?: string
    category_id?: string
    status?: string
    country?: string
    language?: string
    link_type?: string
    price_min?: string
    price_max?: string
    dr_min?: string
    dr_max?: string
  }
) => string

function SitesCatalogDebouncedFilters({
  country,
  language,
  priceMin,
  priceMax,
  drMin,
  drMax,
  buildListHref,
  router,
}: {
  country?: string
  language?: string
  priceMin?: number
  priceMax?: number
  drMin?: number
  drMax?: number
  buildListHref: SitesCatalogBuildListHref
  router: ReturnType<typeof useRouter>
}) {
  const [countryDraft, setCountryDraft] = useState(() => country ?? '')
  const [languageDraft, setLanguageDraft] = useState(() => language ?? '')
  const [priceMinDraft, setPriceMinDraft] = useState(() =>
    priceMin !== undefined ? String(priceMin) : ''
  )
  const [priceMaxDraft, setPriceMaxDraft] = useState(() =>
    priceMax !== undefined ? String(priceMax) : ''
  )
  const [drMinDraft, setDrMinDraft] = useState(() => (drMin !== undefined ? String(drMin) : ''))
  const [drMaxDraft, setDrMaxDraft] = useState(() => (drMax !== undefined ? String(drMax) : ''))

  useEffect(() => {
    const applied = (country ?? '').trim()
    if (countryDraft.trim() === applied) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { country: countryDraft }), { scroll: false })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [countryDraft, country, router, buildListHref])

  useEffect(() => {
    const applied = (language ?? '').trim()
    if (languageDraft.trim() === applied) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { language: languageDraft }), { scroll: false })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [languageDraft, language, router, buildListHref])

  useEffect(() => {
    const appliedStr = priceMin !== undefined ? String(priceMin) : ''
    if (priceMinDraft.trim() === appliedStr.trim()) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { price_min: priceMinDraft, price_max: priceMaxDraft }), {
        scroll: false,
      })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [priceMinDraft, priceMin, priceMaxDraft, router, buildListHref])

  useEffect(() => {
    const appliedStr = priceMax !== undefined ? String(priceMax) : ''
    if (priceMaxDraft.trim() === appliedStr.trim()) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { price_min: priceMinDraft, price_max: priceMaxDraft }), {
        scroll: false,
      })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [priceMaxDraft, priceMax, priceMinDraft, router, buildListHref])

  useEffect(() => {
    const appliedStr = drMin !== undefined ? String(drMin) : ''
    if (drMinDraft.trim() === appliedStr.trim()) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { dr_min: drMinDraft, dr_max: drMaxDraft }), { scroll: false })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [drMinDraft, drMin, drMaxDraft, router, buildListHref])

  useEffect(() => {
    const appliedStr = drMax !== undefined ? String(drMax) : ''
    if (drMaxDraft.trim() === appliedStr.trim()) return
    const id = window.setTimeout(() => {
      router.push(buildListHref(1, { dr_min: drMinDraft, dr_max: drMaxDraft }), { scroll: false })
    }, SITES_FILTER_INPUT_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [drMaxDraft, drMax, drMinDraft, router, buildListHref])

  const pillClass = 'h-8 w-20 rounded-full px-3 text-xs'
  return (
    <>
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Country</span>
        <FormControlInput
          aria-label="Country code"
          placeholder="e.g. US"
          value={countryDraft}
          onChange={(e) => setCountryDraft(e.target.value)}
          maxLength={8}
          className={pillClass}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Language</span>
        <FormControlInput
          aria-label="Language code"
          placeholder="e.g. en"
          value={languageDraft}
          onChange={(e) => setLanguageDraft(e.target.value)}
          maxLength={16}
          className={pillClass}
        />
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">DR</span>
        <div className="gap-inset flex">
          <FormControlInput
            aria-label="DR from"
            inputMode="numeric"
            placeholder="Min"
            value={drMinDraft}
            onChange={(e) => setDrMinDraft(e.target.value)}
            className={pillClass}
          />
          <FormControlInput
            aria-label="DR to"
            inputMode="numeric"
            placeholder="Max"
            value={drMaxDraft}
            onChange={(e) => setDrMaxDraft(e.target.value)}
            className={pillClass}
          />
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Price ($)</span>
        <div className="gap-inset flex">
          <FormControlInput
            aria-label="Price from"
            inputMode="decimal"
            placeholder="Min"
            value={priceMinDraft}
            onChange={(e) => setPriceMinDraft(e.target.value)}
            className={pillClass}
          />
          <FormControlInput
            aria-label="Price to"
            inputMode="decimal"
            placeholder="Max"
            value={priceMaxDraft}
            onChange={(e) => setPriceMaxDraft(e.target.value)}
            className={pillClass}
          />
        </div>
      </div>
    </>
  )
}

export function SitesCatalog({
  role,
  userId,
  rows,
  totalCount,
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
  categories,
  cartSiteIds = [],
}: {
  role: UserRole
  userId: string
  rows: SiteCatalogRow[]
  totalCount: number
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
  categories: SitesCatalogCategoryOption[]
  /** For clients: site IDs already in cart (disables Add to cart until checkout). */
  cartSiteIds?: string[]
}) {
  const router = useRouter()
  const pageSize = SETTINGS_TABLE_PAGE_SIZE

  const [isOpen, setIsOpen] = useState(false)
  const [mobileDetailRow, setMobileDetailRow] = useState<SiteCatalogRow | null>(null)
  const [addingSiteId, setAddingSiteId] = useState<string | null>(null)
  const [removingSiteId, setRemovingSiteId] = useState<string | null>(null)
  const [optimisticCartSiteIds, setOptimisticCartSiteIds] = useState(() => new Set<string>())

  const cartSiteIdSet = useMemo(() => {
    const s = new Set(cartSiteIds)
    for (const id of optimisticCartSiteIds) s.add(id)
    return s
  }, [cartSiteIds, optimisticCartSiteIds])

  const [statusDialog, setStatusDialog] = useState<{
    siteId: string
    domain: string
    currentStatus: Database['public']['Enums']['site_status']
  } | null>(null)

  const hasStructuredFilters =
    categoryId !== undefined ||
    status !== undefined ||
    Boolean(country?.trim()) ||
    Boolean(language?.trim()) ||
    linkType !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined ||
    drMin !== undefined ||
    drMax !== undefined
  const debouncedFiltersKey = `${country ?? ''}|${language ?? ''}|${priceMin ?? ''}|${priceMax ?? ''}|${drMin ?? ''}|${drMax ?? ''}`

  const statusFilterOptions = useMemo(() => {
    if (role === 'client') return [] as Database['public']['Enums']['site_status'][]
    return SITE_STATUSES_ORDERED
  }, [role])
  const categoryFilterOptions = useMemo(
    () => [
      { value: SITES_CATALOG_FILTER_SENTINEL, label: 'All categories' },
      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categories]
  )
  const statusOptions = useMemo(
    () => [
      { value: SITES_CATALOG_FILTER_SENTINEL, label: 'All statuses' },
      ...statusFilterOptions.map((s) => ({ value: s, label: SITE_STATUS_LABEL[s] })),
    ],
    [statusFilterOptions]
  )
  const linkTypeOptions = useMemo(
    () => [
      { value: SITES_CATALOG_FILTER_SENTINEL, label: 'Any link type' },
      ...LINK_TYPES.map((lt) => ({ value: lt, label: lt })),
    ],
    []
  )

  const buildListHref = useCallback(
    (
      nextPage: number,
      overrides?: {
        category_id?: string
        status?: string
        country?: string
        language?: string
        link_type?: string
        price_min?: string
        price_max?: string
        dr_min?: string
        dr_max?: string
      }
    ) => {
      const params = new URLSearchParams()
      const catRaw =
        overrides?.category_id !== undefined
          ? overrides.category_id
          : (categoryId?.toString() ?? '')
      const stRaw = overrides?.status !== undefined ? overrides.status : (status ?? '')
      const coUse = overrides?.country !== undefined ? overrides.country : (country ?? '')
      const langUse = overrides?.language !== undefined ? overrides.language : (language ?? '')
      const ltRaw = overrides?.link_type !== undefined ? overrides.link_type : (linkType ?? '')
      const pminUse =
        overrides?.price_min !== undefined ? overrides.price_min : (priceMin?.toString() ?? '')
      const pmaxUse =
        overrides?.price_max !== undefined ? overrides.price_max : (priceMax?.toString() ?? '')
      const drminUse =
        overrides?.dr_min !== undefined ? overrides.dr_min : (drMin?.toString() ?? '')
      const drmaxUse =
        overrides?.dr_max !== undefined ? overrides.dr_max : (drMax?.toString() ?? '')

      const catParam = sitesCatalogQueryValueForUrl(catRaw)
      const stParam = sitesCatalogQueryValueForUrl(stRaw)
      const ltParam = sitesCatalogQueryValueForUrl(ltRaw)

      if (q.trim()) params.set('q', q.trim())
      if (catParam !== null) params.set('category_id', catParam)
      if (stParam !== null) params.set('status', stParam)
      if (coUse.trim()) params.set('country', coUse.trim())
      if (langUse.trim()) params.set('language', langUse.trim())
      if (ltParam !== null) params.set('link_type', ltParam)
      if (pminUse.trim()) params.set('price_min', pminUse.trim())
      if (pmaxUse.trim()) params.set('price_max', pmaxUse.trim())
      if (drminUse.trim()) params.set('dr_min', drminUse.trim())
      if (drmaxUse.trim()) params.set('dr_max', drmaxUse.trim())
      if (nextPage > 1) params.set('page', String(nextPage))
      const qs = params.toString()
      return qs.length > 0 ? `/sites?${qs}` : '/sites'
    },
    [q, categoryId, status, country, language, linkType, priceMin, priceMax, drMin, drMax]
  )

  const addCart = useCallback(
    (siteId: string, domain: string, onSuccess?: () => void) => {
      if (cartSiteIdSet.has(siteId)) return
      setAddingSiteId(siteId)
      void (async () => {
        try {
          const res = await addSiteToCart(siteId)
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          toast.success('Added to cart', { description: domain })
          setOptimisticCartSiteIds((prev) => new Set(prev).add(siteId))
          onSuccess?.()
          router.refresh()
        } finally {
          setAddingSiteId(null)
        }
      })()
    },
    [cartSiteIdSet, router]
  )

  const removeFromCart = useCallback(
    (siteId: string, domain: string, onSuccess?: () => void) => {
      if (removingSiteId !== null) return
      setRemovingSiteId(siteId)
      void (async () => {
        try {
          const res = await removeFromCartBySiteId(siteId)
          if (!res.ok) {
            toast.error(res.message)
            return
          }
          toast.success('Removed from cart', { description: domain })
          setOptimisticCartSiteIds((prev) => {
            if (!prev.has(siteId)) return prev
            const next = new Set(prev)
            next.delete(siteId)
            return next
          })
          onSuccess?.()
          router.refresh()
        } finally {
          setRemovingSiteId(null)
        }
      })()
    },
    [removingSiteId, router]
  )

  const filtersActive = q.trim() || hasStructuredFilters

  const countLabel = filtersActive
    ? `${totalCount} match${totalCount === 1 ? '' : 'es'}`
    : `${totalCount} site${totalCount === 1 ? '' : 's'}`

  const emptyTitle = filtersActive
    ? 'No sites match your filters'
    : role === 'client'
      ? 'No active listings yet'
      : 'No sites yet'

  const canCreate = role === 'sourcer'
  const canUseCart = role === 'client'
  const canAdminStatus = role === 'admin'

  function openChangeStatusDialog(row: SiteCatalogRow) {
    setStatusDialog({
      siteId: row.id,
      domain: row.domain,
      currentStatus: row.status,
    })
  }

  const editAllowed = useCallback(
    (row: SiteCatalogRow) => {
      if (role === 'admin') return true
      if (role === 'sourcer' && row.sourcer_id === userId && row.status !== 'archived') return true
      return false
    },
    [role, userId]
  )

  function openEditFromMobile(row: SiteCatalogRow) {
    setMobileDetailRow(null)
    queueMicrotask(() => router.push(`/sites/${row.id}/edit`))
  }

  return (
    <div className="gap-layout flex flex-col">
      <SiteChangeStatusDialog
        siteId={statusDialog?.siteId ?? ''}
        domainLabel={statusDialog?.domain ?? ''}
        currentStatus={statusDialog?.currentStatus}
        open={statusDialog !== null}
        onOpenChange={(open) => {
          if (!open) setStatusDialog(null)
        }}
        transitions={statusDialog ? siteAdminTransitions(statusDialog.currentStatus) : []}
      />

      <PageHeader
        title="Site catalog"
        description={
          <>
            Browse placement inventory. Clients only see active listings; staff use filters to
            narrow the directory.
            {role === 'admin' ? (
              <>
                {' '}
                Categories live under{' '}
                <Link
                  href="/settings/categories"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Settings → Categories
                </Link>
                .
              </>
            ) : null}
          </>
        }
        action={
          <div className="gap-inset flex w-full min-w-0 flex-row items-center sm:w-auto sm:flex-wrap sm:justify-end">
            <SearchField
              name="q"
              placeholder="Search domain, keywords, description, category…"
              ariaLabel="Search sites"
            />
            {canCreate ? (
              <Link
                href="/sites/new"
                className={cn(
                  buttonVariants({ variant: 'cta', size: 'default' }),
                  'gap-inset h-10 min-h-10 shrink-0 justify-center rounded-full'
                )}
              >
                <Plus className="size-4" aria-hidden />
                Create site
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="border-border/60 bg-card shadow-soft sticky top-14 z-30 overflow-hidden rounded-2xl border">
        <div className="px-section py-block gap-inset flex items-center sm:flex-wrap">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-muted-foreground gap-inset mb-0.5 flex shrink-0 items-center text-xs font-medium"
          >
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
            <ChevronDown
              className={cn(
                'size-3.5 shrink-0 transition-transform duration-200 ease-in-out',
                isOpen && 'rotate-180'
              )}
              aria-hidden
            />
          </button>
          <span className="text-muted-foreground ml-auto shrink-0 self-end pb-0.5 text-xs tabular-nums">
            {countLabel}
          </span>
        </div>
        <div
          className={cn(
            'overflow-hidden transition-all duration-300',
            isOpen ? 'max-h-125 opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="px-section pb-block gap-inset flex items-end overflow-x-auto sm:flex-wrap">
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Category</span>
              <FilterSelect
                aria-label="Filter by category"
                value={
                  categoryId !== undefined ? String(categoryId) : SITES_CATALOG_FILTER_SENTINEL
                }
                onChange={(e) =>
                  router.push(buildListHref(1, { category_id: e.target.value }), {
                    scroll: false,
                  })
                }
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {categoryFilterOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            {role !== 'client' ? (
              <div className="flex shrink-0 flex-col gap-0.5">
                <span className="text-muted-foreground px-1 text-[10px] font-medium">Status</span>
                <FilterSelect
                  aria-label="Filter by status"
                  value={status ?? SITES_CATALOG_FILTER_SENTINEL}
                  onChange={(e) =>
                    router.push(buildListHref(1, { status: e.target.value }), { scroll: false })
                  }
                  className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
                >
                  {statusOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </FilterSelect>
              </div>
            ) : null}
            <div className="flex shrink-0 flex-col gap-0.5">
              <span className="text-muted-foreground px-1 text-[10px] font-medium">Link type</span>
              <FilterSelect
                aria-label="Filter by link type"
                value={linkType ?? SITES_CATALOG_FILTER_SENTINEL}
                onChange={(e) =>
                  router.push(buildListHref(1, { link_type: e.target.value }), { scroll: false })
                }
                className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
              >
                {linkTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </FilterSelect>
            </div>
            <SitesCatalogDebouncedFilters
              key={debouncedFiltersKey}
              country={country}
              language={language}
              priceMin={priceMin}
              priceMax={priceMax}
              drMin={drMin}
              drMax={drMax}
              buildListHref={buildListHref}
              router={router}
            />
            {filtersActive ? (
              <Link
                href="/sites"
                scroll={false}
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'sm' }),
                  'h-8 shrink-0 gap-2 self-end rounded-full px-3 text-xs'
                )}
              >
                <RotateCcw className="size-3.5" aria-hidden />
                Clear filters
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <div className="flex flex-col">
          {totalCount === 0 ? (
            <div className="px-section py-block">
              <div className="gap-block py-hero flex flex-col items-center text-center">
                <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
                  <Globe className="size-7" aria-hidden />
                </span>
                <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
                  {emptyTitle}
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  {filtersActive
                    ? 'Try clearing filters or changing your search.'
                    : 'Create a site from the catalog once categories exist.'}
                </p>
                <div className="gap-inset mt-block mx-auto flex w-full max-w-sm flex-col items-stretch justify-center sm:flex-row sm:flex-wrap sm:justify-center">
                  {filtersActive ? (
                    <Link
                      href="/sites"
                      scroll={false}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'default' }),
                        'h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full sm:w-auto'
                      )}
                    >
                      <RotateCcw className="size-4" aria-hidden />
                      Clear filters
                    </Link>
                  ) : null}
                  {canCreate && !filtersActive ? (
                    <Link
                      href="/sites/new"
                      className={cn(
                        buttonVariants({ variant: 'cta', size: 'default' }),
                        'h-10 min-h-10 w-full justify-center gap-2 rounded-full sm:w-auto'
                      )}
                    >
                      <Plus className="size-4" aria-hidden />
                      Create site
                    </Link>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="hidden w-full min-w-0 md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border bg-transparent hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent [&>th]:border-b-0">
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Domain
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        DR
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Category
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Top countries
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Price
                      </TableHead>
                      {role === 'admin' || role === 'sourcer' ? (
                        <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                          Status
                        </TableHead>
                      ) : null}
                      <TableHead className="text-muted-foreground h-11 pr-5 pl-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="group/site-row border-border hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent"
                      >
                        <TableCell className={SITE_ROW_CELL}>
                          <Link
                            href={`/sites/${row.id}`}
                            className="text-foreground font-medium underline-offset-4 hover:underline"
                          >
                            {row.domain}
                          </Link>
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL_MUTED}>{row.dr ?? '—'}</TableCell>
                        <TableCell className={SITE_ROW_CELL}>{row.category_name ?? '—'}</TableCell>
                        <TableCell className={SITE_ROW_CELL_MUTED}>
                          <ValuePillList values={row.countries} warm max={2} />
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL_MUTED}>
                          {row.price.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                        {role === 'admin' || role === 'sourcer' ? (
                          <TableCell className={SITE_ROW_CELL}>
                            <SiteStatusBadge status={row.status} />
                          </TableCell>
                        ) : null}
                        <TableCell
                          className={SITE_ROW_CELL_ACTIONS}
                          data-row-actions
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-end gap-1">
                            {canUseCart && cartSiteIdSet.has(row.id) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-destructive gap-1.5"
                                disabled={removingSiteId === row.id}
                                onClick={() => removeFromCart(row.id, row.domain)}
                                aria-label={`Remove ${row.domain} from cart`}
                              >
                                <Trash2 className="size-4 shrink-0" aria-hidden />
                                <span className="hidden lg:inline">Remove</span>
                              </Button>
                            ) : canUseCart ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-foreground gap-1.5"
                                disabled={row.status !== 'active' || addingSiteId === row.id}
                                onClick={() => addCart(row.id, row.domain)}
                                aria-label={`Add ${row.domain} to cart`}
                              >
                                <ShoppingCart className="size-4 shrink-0" aria-hidden />
                                <span className="hidden lg:inline">
                                  {addingSiteId === row.id ? 'Adding…' : 'Add to cart'}
                                </span>
                              </Button>
                            ) : null}
                            <SiteCatalogRowActions
                              row={row}
                              role={role}
                              canAdminStatus={canAdminStatus}
                              editAllowed={editAllowed(row)}
                              onOpenChangeStatus={openChangeStatusDialog}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="px-section py-block md:hidden">
                <ul className="divide-border divide-y rounded-xl border">
                  {rows.map((row) => (
                    <li key={row.id}>
                      <div className="gap-block px-inset py-block flex items-start justify-between">
                        <Button
                          type="button"
                          variant="ghost"
                          className="hover:bg-muted/40 focus-visible:ring-ring h-auto min-w-0 flex-1 justify-start rounded-lg px-0 py-0 text-left transition-colors focus-visible:ring-2"
                          onClick={() => setMobileDetailRow(row)}
                          aria-label={`${row.domain}, site summary`}
                        >
                          <div>
                            <p className="text-foreground font-medium">{row.domain}</p>
                            <p className="text-muted-foreground mt-inset text-xs tabular-nums">
                              DR {row.dr ?? '—'} ·{' '}
                              {row.price.toLocaleString(undefined, {
                                style: 'currency',
                                currency: 'USD',
                              })}
                            </p>
                            {role === 'admin' || role === 'sourcer' ? (
                              <div className="mt-inset">
                                <SiteStatusBadge status={row.status} />
                              </div>
                            ) : null}
                          </div>
                        </Button>
                        <div data-row-actions className="flex shrink-0 items-center gap-1">
                          {canUseCart && cartSiteIdSet.has(row.id) ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-destructive"
                              disabled={removingSiteId === row.id}
                              onClick={() => removeFromCart(row.id, row.domain)}
                              aria-label={`Remove ${row.domain} from cart`}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </Button>
                          ) : canUseCart ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              className="text-muted-foreground hover:text-foreground"
                              disabled={row.status !== 'active' || addingSiteId === row.id}
                              onClick={() => addCart(row.id, row.domain)}
                              aria-label={`Add ${row.domain} to cart`}
                            >
                              <ShoppingCart className="size-4" aria-hidden />
                            </Button>
                          ) : null}
                          <SiteCatalogRowActions
                            row={row}
                            role={role}
                            canAdminStatus={canAdminStatus}
                            editAllowed={editAllowed(row)}
                            onOpenChangeStatus={openChangeStatusDialog}
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <SettingsTablePagination
                page={page}
                pageSize={pageSize}
                totalCount={totalCount}
                buildHref={(p) => buildListHref(p)}
              />
            </>
          )}
        </div>
      </section>

      <SettingsRightSheet
        open={mobileDetailRow !== null}
        onOpenChange={(open) => {
          if (!open) setMobileDetailRow(null)
        }}
        title={mobileDetailRow?.domain ?? '\u200b'}
        description={
          mobileDetailRow
            ? `${mobileDetailRow.category_name ?? 'Uncategorized'} · ${SITE_STATUS_LABEL[mobileDetailRow.status]} · ${mobileDetailRow.price.toLocaleString(undefined, { style: 'currency', currency: 'USD' })}`
            : undefined
        }
        footer={
          mobileDetailRow ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => setMobileDetailRow(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="default"
                className="w-full gap-2 sm:w-auto"
                onClick={() => router.push(`/sites/${mobileDetailRow.id}`)}
              >
                <Eye className="size-4" aria-hidden />
                View
              </Button>
              {canUseCart &&
              mobileDetailRow.status === 'active' &&
              cartSiteIdSet.has(mobileDetailRow.id) ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  disabled={removingSiteId === mobileDetailRow.id}
                  onClick={() =>
                    removeFromCart(mobileDetailRow.id, mobileDetailRow.domain, () =>
                      setMobileDetailRow(null)
                    )
                  }
                >
                  <Trash2 className="size-4" aria-hidden />
                  {removingSiteId === mobileDetailRow.id ? 'Removing…' : 'Remove from cart'}
                </Button>
              ) : canUseCart && mobileDetailRow.status === 'active' ? (
                <Button
                  type="button"
                  variant="cta"
                  className="w-full gap-2 sm:w-auto"
                  disabled={addingSiteId === mobileDetailRow.id}
                  onClick={() =>
                    addCart(mobileDetailRow.id, mobileDetailRow.domain, () =>
                      setMobileDetailRow(null)
                    )
                  }
                >
                  <ShoppingCart className="size-4" aria-hidden />
                  {addingSiteId === mobileDetailRow.id ? 'Adding…' : 'Add to cart'}
                </Button>
              ) : null}
              {editAllowed(mobileDetailRow) ? (
                <Button
                  type="button"
                  variant="cta"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => openEditFromMobile(mobileDetailRow)}
                >
                  <Pencil className="size-4" aria-hidden />
                  Edit
                </Button>
              ) : null}
            </>
          ) : null
        }
        footerClassName="gap-block flex-col items-stretch sm:flex-col"
      >
        {mobileDetailRow ? (
          <div className="gap-inset flex flex-col">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Domain
            </p>
            <p className="text-foreground font-medium">{mobileDetailRow.domain}</p>
            <p className="text-muted-foreground mt-block text-xs tabular-nums">
              DR {mobileDetailRow.dr ?? '—'} ·{' '}
              {mobileDetailRow.countries.slice(0, 6).join(', ') || '—'}
            </p>
          </div>
        ) : null}
      </SettingsRightSheet>
    </div>
  )
}
