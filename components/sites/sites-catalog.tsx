'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  Eye,
  Filter,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShoppingCart,
} from 'lucide-react'
import { toast } from 'sonner'

import { SiteChangeStatusDialog } from '@/components/sites/site-change-status-dialog'
import { SettingsRightSheet } from '@/components/settings/settings-right-sheet'
import { SettingsTablePagination } from '@/components/settings/settings-table-pagination'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FormControlInput } from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SETTINGS_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'
import {
  siteAdminTransitionMenuLabel,
  siteAdminTransitions,
} from '@/lib/sites/admin-site-transitions'
import type { SiteCatalogRow } from '@/lib/sites/load-sites-catalog'
import { addSiteToCart } from '@/lib/sites/site-actions'
import type { SiteAdminTransition } from '@/lib/sites/site-actions'
import { SITE_STATUS_LABEL, SITE_STATUSES_ORDERED } from '@/lib/sites/site-status-labels'
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
  categories,
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
  categories: SitesCatalogCategoryOption[]
}) {
  const router = useRouter()
  const pageSize = SETTINGS_TABLE_PAGE_SIZE
  const [searchDraft, setSearchDraft] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  if (q !== prevQ) {
    setPrevQ(q)
    setSearchDraft(q)
  }

  const [mobileDetailRow, setMobileDetailRow] = useState<SiteCatalogRow | null>(null)
  const [cartPending, startCartTransition] = useTransition()
  const [statusDialog, setStatusDialog] = useState<{
    siteId: string
    domain: string
    transition: SiteAdminTransition | null
  } | null>(null)

  const hasStructuredFilters =
    categoryId !== undefined ||
    status !== undefined ||
    Boolean(country?.trim()) ||
    Boolean(language?.trim()) ||
    linkType !== undefined ||
    priceMin !== undefined ||
    priceMax !== undefined

  const statusFilterOptions = useMemo(() => {
    if (role === 'client') return [] as Database['public']['Enums']['site_status'][]
    return SITE_STATUSES_ORDERED.filter((s) => s !== 'inactive')
  }, [role])

  const buildListHref = useCallback(
    (
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
      }
    ) => {
      const params = new URLSearchParams()
      const qUse = overrides?.q !== undefined ? overrides.q : q
      const catUse =
        overrides?.category_id !== undefined
          ? overrides.category_id
          : (categoryId?.toString() ?? '')
      const stUse = overrides?.status !== undefined ? overrides.status : (status ?? '')
      const coUse = overrides?.country !== undefined ? overrides.country : (country ?? '')
      const langUse = overrides?.language !== undefined ? overrides.language : (language ?? '')
      const ltUse = overrides?.link_type !== undefined ? overrides.link_type : (linkType ?? '')
      const pminUse =
        overrides?.price_min !== undefined ? overrides.price_min : (priceMin?.toString() ?? '')
      const pmaxUse =
        overrides?.price_max !== undefined ? overrides.price_max : (priceMax?.toString() ?? '')

      if (qUse.trim()) params.set('q', qUse.trim())
      if (catUse.trim()) params.set('category_id', catUse.trim())
      if (stUse.trim()) params.set('status', stUse.trim())
      if (coUse.trim()) params.set('country', coUse.trim())
      if (langUse.trim()) params.set('language', langUse.trim())
      if (ltUse.trim()) params.set('link_type', ltUse.trim())
      if (pminUse.trim()) params.set('price_min', pminUse.trim())
      if (pmaxUse.trim()) params.set('price_max', pmaxUse.trim())
      if (nextPage > 1) params.set('page', String(nextPage))
      const qs = params.toString()
      return qs.length > 0 ? `/sites?${qs}` : '/sites'
    },
    [q, categoryId, status, country, language, linkType, priceMin, priceMax]
  )

  const onSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      router.push(buildListHref(1, { q: searchDraft }), { scroll: false })
    },
    [router, buildListHref, searchDraft]
  )

  const addCart = useCallback((siteId: string, domain: string) => {
    startCartTransition(async () => {
      const res = await addSiteToCart(siteId)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success(`${domain} added to cart.`)
    })
  }, [])

  const filtersActive = q.trim() || hasStructuredFilters

  const countLabel = filtersActive
    ? `${totalCount} match${totalCount === 1 ? '' : 'es'}`
    : `${totalCount} site${totalCount === 1 ? '' : 's'}`

  const emptyTitle = filtersActive
    ? 'No sites match your filters'
    : role === 'client'
      ? 'No active listings yet'
      : 'No sites yet'

  const canCreate = role === 'sourcer' || role === 'admin'
  const canUseCart = role === 'client'
  const canAdminStatus = role === 'admin'

  function openStatus(siteId: string, domain: string, transition: SiteAdminTransition) {
    setStatusDialog({ siteId, domain, transition })
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
        open={statusDialog !== null && statusDialog.transition !== null}
        onOpenChange={(open) => {
          if (!open) setStatusDialog(null)
        }}
        transition={statusDialog?.transition ?? null}
      />

      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <header className="border-border/60 gap-block px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-inset min-w-0">
            <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
              Site catalog
            </h2>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              Browse placement inventory. Clients only see active listings; staff use filters to
              narrow the directory.
            </p>
            {role === 'admin' ? (
              <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
                Categories live under{' '}
                <Link
                  href="/settings/categories"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  Settings → Categories
                </Link>
                .
              </p>
            ) : null}
          </div>
          <div className="gap-block flex w-full flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <form
              onSubmit={onSearchSubmit}
              className="relative w-full min-w-0 sm:max-w-xs sm:min-w-48 sm:flex-none"
            >
              <Search
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                aria-hidden
              />
              <FormControlInput
                type="search"
                placeholder="Search domain, keywords, description…"
                value={searchDraft}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchDraft(v)
                  if (!v.trim() && q.trim()) {
                    router.push(buildListHref(1, { q: '' }), { scroll: false })
                  }
                }}
                className="pr-3 pl-10"
                aria-label="Search sites"
              />
            </form>
            <span className="text-muted-foreground block w-full text-xs tabular-nums sm:inline sm:w-auto">
              {countLabel}
            </span>
            {canCreate ? (
              <Link
                href="/sites/new"
                className={cn(
                  buttonVariants({ variant: 'cta', size: 'default' }),
                  'h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full sm:w-auto'
                )}
              >
                <Plus className="size-4" aria-hidden />
                Create site
              </Link>
            ) : null}
          </div>
        </header>

        {role !== 'client' ? (
          <div className="border-border/60 gap-inset px-section py-block flex flex-col border-b">
            <div className="text-muted-foreground gap-inset flex items-center text-xs font-medium">
              <Filter className="size-3.5 shrink-0" aria-hidden />
              <span>Filters</span>
            </div>
            <div className="gap-block grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
              <div className="gap-inset flex flex-col">
                <Label htmlFor="filter-category" className="text-muted-foreground text-xs">
                  Category
                </Label>
                <select
                  id="filter-category"
                  className={cn(
                    'border-border/70 bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50',
                    'h-10 w-full min-w-0 cursor-pointer rounded-full border px-4 pr-10 text-sm outline-none',
                    'focus-visible:ring-3'
                  )}
                  value={categoryId?.toString() ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    router.push(buildListHref(1, { category_id: v }), { scroll: false })
                  }}
                >
                  <option value="">All categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="filter-status" className="text-muted-foreground text-xs">
                  Status
                </Label>
                <select
                  id="filter-status"
                  className={cn(
                    'border-border/70 bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50',
                    'h-10 w-full min-w-0 cursor-pointer rounded-full border px-4 pr-10 text-sm outline-none',
                    'focus-visible:ring-3'
                  )}
                  value={status ?? ''}
                  onChange={(e) =>
                    router.push(buildListHref(1, { status: e.target.value }), { scroll: false })
                  }
                >
                  <option value="">All statuses</option>
                  {statusFilterOptions.map((s) => (
                    <option key={s} value={s}>
                      {SITE_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="filter-country" className="text-muted-foreground text-xs">
                  Country code
                </Label>
                <FormControlInput
                  id="filter-country"
                  placeholder="e.g. US"
                  value={country ?? ''}
                  onChange={(e) =>
                    router.push(buildListHref(1, { country: e.target.value }), { scroll: false })
                  }
                  maxLength={8}
                />
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="filter-language" className="text-muted-foreground text-xs">
                  Language code
                </Label>
                <FormControlInput
                  id="filter-language"
                  placeholder="e.g. en"
                  value={language ?? ''}
                  onChange={(e) =>
                    router.push(buildListHref(1, { language: e.target.value }), { scroll: false })
                  }
                  maxLength={16}
                />
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="filter-link" className="text-muted-foreground text-xs">
                  Link type
                </Label>
                <select
                  id="filter-link"
                  className={cn(
                    'border-border/70 bg-muted/40 focus-visible:border-ring focus-visible:ring-ring/50',
                    'h-10 w-full min-w-0 cursor-pointer rounded-full border px-4 pr-10 text-sm outline-none',
                    'focus-visible:ring-3'
                  )}
                  value={linkType ?? ''}
                  onChange={(e) =>
                    router.push(buildListHref(1, { link_type: e.target.value }), { scroll: false })
                  }
                >
                  <option value="">Any link type</option>
                  {LINK_TYPES.map((lt) => (
                    <option key={lt} value={lt}>
                      {lt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="price-min" className="text-muted-foreground text-xs">
                  Price from
                </Label>
                <FormControlInput
                  id="price-min"
                  inputMode="decimal"
                  placeholder="0"
                  value={priceMin !== undefined ? String(priceMin) : ''}
                  onChange={(e) => {
                    const v = e.target.value
                    router.push(buildListHref(1, { price_min: v }), { scroll: false })
                  }}
                />
              </div>
              <div className="gap-inset flex flex-col">
                <Label htmlFor="price-max" className="text-muted-foreground text-xs">
                  Price to
                </Label>
                <FormControlInput
                  id="price-max"
                  inputMode="decimal"
                  placeholder="9999"
                  value={priceMax !== undefined ? String(priceMax) : ''}
                  onChange={(e) => {
                    const v = e.target.value
                    router.push(buildListHref(1, { price_max: v }), { scroll: false })
                  }}
                />
              </div>
            </div>
          </div>
        ) : null}

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
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Status
                      </TableHead>
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
                        <TableCell className={SITE_ROW_CELL_MUTED} title={row.countries.join(', ')}>
                          {row.countries.slice(0, 4).join(', ')}
                          {row.countries.length > 4 ? '…' : ''}
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL_MUTED}>
                          {row.price.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL}>
                          {SITE_STATUS_LABEL[row.status]}
                        </TableCell>
                        <TableCell
                          className={SITE_ROW_CELL_ACTIONS}
                          data-row-actions
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              aria-label={`Manage ${row.domain}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'rounded-full opacity-80 hover:opacity-100'
                              )}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                  Manage
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => router.push(`/sites/${row.id}`)}
                                >
                                  <Eye className="size-4" aria-hidden />
                                  View
                                </DropdownMenuItem>
                                {editAllowed(row) ? (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => router.push(`/sites/${row.id}/edit`)}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                    Edit
                                  </DropdownMenuItem>
                                ) : null}
                                {canUseCart ? (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    disabled={cartPending || row.status !== 'active'}
                                    onClick={() => addCart(row.id, row.domain)}
                                  >
                                    <ShoppingCart className="size-4" aria-hidden />
                                    Add to cart
                                  </DropdownMenuItem>
                                ) : null}
                                {canAdminStatus ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                      Change status
                                    </DropdownMenuLabel>
                                    {siteAdminTransitions(row.status).map((t) => (
                                      <DropdownMenuItem
                                        key={t}
                                        onSelect={() => openStatus(row.id, row.domain, t)}
                                      >
                                        {siteAdminTransitionMenuLabel(row.status, t)}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                ) : null}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                        <button
                          type="button"
                          className="hover:bg-muted/40 focus-visible:ring-ring min-w-0 flex-1 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          onClick={() => setMobileDetailRow(row)}
                          aria-label={`${row.domain}, site summary`}
                        >
                          <p className="text-foreground font-medium">{row.domain}</p>
                          <p className="text-muted-foreground mt-inset text-xs tabular-nums">
                            DR {row.dr ?? '—'} ·{' '}
                            {row.price.toLocaleString(undefined, {
                              style: 'currency',
                              currency: 'USD',
                            })}
                          </p>
                          <p className="text-muted-foreground mt-inset text-xs">
                            {SITE_STATUS_LABEL[row.status]}
                          </p>
                        </button>
                        <div data-row-actions className="shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              aria-label={`Manage ${row.domain}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'rounded-full opacity-80 hover:opacity-100'
                              )}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-48">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                  Manage
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="gap-2"
                                  onClick={() => router.push(`/sites/${row.id}`)}
                                >
                                  <Eye className="size-4" aria-hidden />
                                  View
                                </DropdownMenuItem>
                                {editAllowed(row) ? (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    onClick={() => router.push(`/sites/${row.id}/edit`)}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                    Edit
                                  </DropdownMenuItem>
                                ) : null}
                                {canUseCart ? (
                                  <DropdownMenuItem
                                    className="gap-2"
                                    disabled={cartPending || row.status !== 'active'}
                                    onClick={() => addCart(row.id, row.domain)}
                                  >
                                    <ShoppingCart className="size-4" aria-hidden />
                                    Add to cart
                                  </DropdownMenuItem>
                                ) : null}
                                {canAdminStatus ? (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                      Change status
                                    </DropdownMenuLabel>
                                    {siteAdminTransitions(row.status).map((t) => (
                                      <DropdownMenuItem
                                        key={t}
                                        onSelect={() => openStatus(row.id, row.domain, t)}
                                      >
                                        {siteAdminTransitionMenuLabel(row.status, t)}
                                      </DropdownMenuItem>
                                    ))}
                                  </>
                                ) : null}
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
