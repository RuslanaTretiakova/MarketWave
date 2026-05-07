'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Globe,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
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
import { FormControlInput, FormControlSelect } from '@/components/ui/form-control'
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

const SITE_STATUS_CHIP: Record<Database['public']['Enums']['site_status'], string> = {
  pending: 'bg-amber-500/12 text-amber-900 dark:text-amber-100',
  needs_changes: 'bg-rose-500/12 text-rose-900 dark:text-rose-100',
  active: 'bg-emerald-500/12 text-emerald-900 dark:text-emerald-100',
  archived: 'bg-muted text-muted-foreground',
  // legacy enum values — no longer used in workflow
  approved: 'bg-sky-500/12 text-sky-900 dark:text-sky-100',
  inactive: 'bg-muted text-muted-foreground',
}

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
    currentStatus: Database['public']['Enums']['site_status']
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
  const [filtersOpen, setFiltersOpen] = useState(() => role !== 'client' && hasStructuredFilters)

  const statusFilterOptions = useMemo(() => {
    if (role === 'client') return [] as Database['public']['Enums']['site_status'][]
    return SITE_STATUSES_ORDERED
  }, [role])
  const categoryFilterOptions = useMemo(
    () => [
      { value: '', label: 'All categories' },
      ...categories.map((c) => ({ value: String(c.id), label: c.name })),
    ],
    [categories]
  )
  const statusOptions = useMemo(
    () => [
      { value: '', label: 'All statuses' },
      ...statusFilterOptions.map((s) => ({ value: s, label: SITE_STATUS_LABEL[s] })),
    ],
    [statusFilterOptions]
  )
  const linkTypeOptions = useMemo(
    () => [
      { value: '', label: 'Any link type' },
      ...LINK_TYPES.map((lt) => ({ value: lt, label: lt })),
    ],
    []
  )

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
  if (role !== 'client' && hasStructuredFilters && !filtersOpen) {
    setFiltersOpen(true)
  }

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

  function openStatus(
    siteId: string,
    domain: string,
    currentStatus: Database['public']['Enums']['site_status'],
    transition: SiteAdminTransition
  ) {
    setStatusDialog({ siteId, domain, currentStatus, transition })
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

        <div className="border-border/60 px-section py-block border-b">
          <div className="gap-inset flex items-center">
            <form onSubmit={onSearchSubmit} className="relative min-w-0 flex-1">
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
            {role !== 'client' ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 min-h-10 rounded-full px-4"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="sites-catalog-filters"
              >
                <Filter className="size-4" aria-hidden />
                Filters
                {filtersOpen ? (
                  <ChevronUp className="size-4 opacity-70" aria-hidden />
                ) : (
                  <ChevronDown className="size-4 opacity-70" aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        </div>

        {role !== 'client' ? (
          <>
            {filtersOpen ? (
              <div className="px-section py-block border-border/60 bg-muted/20 border-b">
                <div
                  id="sites-catalog-filters"
                  className="gap-block grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
                >
                  <div className="gap-inset flex flex-col">
                    <Label htmlFor="filter-category" className="text-muted-foreground text-xs">
                      Category
                    </Label>
                    <FormControlSelect
                      id="filter-category"
                      value={categoryId?.toString() ?? ''}
                      onValueChange={(value) =>
                        router.push(buildListHref(1, { category_id: value }), { scroll: false })
                      }
                      options={categoryFilterOptions}
                    />
                  </div>
                  <div className="gap-inset flex flex-col">
                    <Label htmlFor="filter-status" className="text-muted-foreground text-xs">
                      Status
                    </Label>
                    <FormControlSelect
                      id="filter-status"
                      value={status ?? ''}
                      onValueChange={(value) =>
                        router.push(buildListHref(1, { status: value }), { scroll: false })
                      }
                      options={statusOptions}
                    />
                  </div>
                  <div className="gap-inset flex flex-col">
                    <Label htmlFor="filter-country" className="text-muted-foreground text-xs">
                      Country code
                    </Label>
                    <FormControlInput
                      id="filter-country"
                      placeholder="Any country"
                      value={country ?? ''}
                      onChange={(e) =>
                        router.push(buildListHref(1, { country: e.target.value }), {
                          scroll: false,
                        })
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
                      placeholder="All languages"
                      value={language ?? ''}
                      onChange={(e) =>
                        router.push(buildListHref(1, { language: e.target.value }), {
                          scroll: false,
                        })
                      }
                      maxLength={16}
                    />
                  </div>
                  <div className="gap-inset flex flex-col">
                    <Label htmlFor="filter-link" className="text-muted-foreground text-xs">
                      Link type
                    </Label>
                    <FormControlSelect
                      id="filter-link"
                      value={linkType ?? ''}
                      onValueChange={(value) =>
                        router.push(buildListHref(1, { link_type: value }), { scroll: false })
                      }
                      options={linkTypeOptions}
                    />
                  </div>
                  <div className="gap-inset flex flex-col">
                    <Label htmlFor="price-min" className="text-muted-foreground text-xs">
                      Price from
                    </Label>
                    <FormControlInput
                      id="price-min"
                      inputMode="decimal"
                      placeholder="From"
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
                      placeholder="To"
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
          </>
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
                        <TableCell className={SITE_ROW_CELL_MUTED}>
                          <ValuePillList values={row.countries} warm max={2} />
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL_MUTED}>
                          {row.price.toLocaleString(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          })}
                        </TableCell>
                        <TableCell className={SITE_ROW_CELL}>
                          <span
                            className={cn(
                              'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                              SITE_STATUS_CHIP[row.status]
                            )}
                          >
                            <span
                              className="size-1.5 rounded-full bg-current opacity-70"
                              aria-hidden
                            />
                            {SITE_STATUS_LABEL[row.status]}
                          </span>
                        </TableCell>
                        <TableCell
                          className={SITE_ROW_CELL_ACTIONS}
                          data-row-actions
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="gap-inset inline-flex items-center justify-end">
                            {canUseCart ? (
                              <Button
                                type="button"
                                variant="cta"
                                size="sm"
                                className="h-9 rounded-full px-3"
                                disabled={cartPending || row.status !== 'active'}
                                onClick={() => addCart(row.id, row.domain)}
                              >
                                <ShoppingCart className="size-4" aria-hidden />
                                Add to cart
                              </Button>
                            ) : (
                              <>
                                {editAllowed(row) ? (
                                  <Link
                                    href={`/sites/${row.id}/edit`}
                                    className={cn(
                                      buttonVariants({ variant: 'outline', size: 'sm' }),
                                      'h-9 rounded-full px-3'
                                    )}
                                  >
                                    <Pencil className="size-4" aria-hidden />
                                    Edit
                                  </Link>
                                ) : (
                                  <Link
                                    href={`/sites/${row.id}`}
                                    className={cn(
                                      buttonVariants({ variant: 'outline', size: 'sm' }),
                                      'h-9 rounded-full px-3'
                                    )}
                                  >
                                    <Eye className="size-4" aria-hidden />
                                    View
                                  </Link>
                                )}
                                {canAdminStatus ? (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger
                                      type="button"
                                      className={cn(
                                        buttonVariants({ variant: 'outline', size: 'sm' }),
                                        'h-9 rounded-full px-3'
                                      )}
                                    >
                                      <ShieldCheck className="size-4" aria-hidden />
                                      Status
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="min-w-48">
                                      <DropdownMenuGroup>
                                        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                          Change status
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator />
                                        {siteAdminTransitions(row.status).map((t) => (
                                          <DropdownMenuItem
                                            key={t}
                                            onSelect={() =>
                                              openStatus(row.id, row.domain, row.status, t)
                                            }
                                          >
                                            {siteAdminTransitionMenuLabel(t)}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuGroup>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                ) : null}
                              </>
                            )}
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
                            <div className="mt-inset">
                              <span
                                className={cn(
                                  'inline-flex min-h-6 items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
                                  SITE_STATUS_CHIP[row.status]
                                )}
                              >
                                <span
                                  className="size-1.5 rounded-full bg-current opacity-70"
                                  aria-hidden
                                />
                                {SITE_STATUS_LABEL[row.status]}
                              </span>
                            </div>
                          </div>
                        </Button>
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
                                        onSelect={() =>
                                          openStatus(row.id, row.domain, row.status, t)
                                        }
                                      >
                                        {siteAdminTransitionMenuLabel(t)}
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
