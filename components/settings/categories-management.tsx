'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, Pencil, Plus, RotateCcw, Search, Tags } from 'lucide-react'
import { toast } from 'sonner'

import { createCategory, updateCategory } from '@/lib/categories/category-admin-actions'
import { formatRelativeLastActive } from '@/lib/format-relative-auth'
import {
  SETTINGS_RIGHT_SHEET_CONTENT_CLASS,
  SettingsRightSheet,
} from '@/components/settings/settings-right-sheet'
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type CategoryRow = {
  id: number
  name: string
  created_at: string
}

type SheetState =
  | { open: false }
  | { open: true; mode: 'create' }
  | { open: true; mode: 'edit'; row: CategoryRow }

const CATEGORY_ROW_CELL =
  'px-4 py-3 align-middle whitespace-normal transition-colors group-hover/category-row:bg-muted/50 group-has-[[aria-expanded=true]]/category-row:bg-muted/50'

const CATEGORY_ROW_CELL_MUTED =
  'text-muted-foreground px-4 py-3 align-middle tabular-nums whitespace-normal transition-colors group-hover/category-row:bg-muted/50 group-has-[[aria-expanded=true]]/category-row:bg-muted/50'

const CATEGORY_ROW_CELL_ACTIONS =
  'px-4 py-3 align-middle text-right whitespace-normal transition-colors group-hover/category-row:bg-muted/50 group-has-[[aria-expanded=true]]/category-row:bg-muted/50'

export function CategoriesManagement({
  initialRows,
  totalCount,
  page,
  pageSize,
  q,
}: {
  initialRows: CategoryRow[]
  totalCount: number
  page: number
  pageSize: number
  q: string
}) {
  const router = useRouter()
  const [mobileDetailRow, setMobileDetailRow] = useState<CategoryRow | null>(null)
  const [sheet, setSheet] = useState<SheetState>({ open: false })
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [searchDraft, setSearchDraft] = useState(q)
  const [prevQ, setPrevQ] = useState(q)
  if (q !== prevQ) {
    setPrevQ(q)
    setSearchDraft(q)
  }

  const buildListHref = useCallback(
    (nextPage: number, nextQ?: string) => {
      const params = new URLSearchParams()
      const qUse = nextQ !== undefined ? nextQ : q
      if (qUse.trim()) params.set('q', qUse.trim())
      if (nextPage > 1) params.set('page', String(nextPage))
      const s = params.toString()
      return s ? `/settings/categories?${s}` : '/settings/categories'
    },
    [q]
  )

  function openCreate() {
    setFormError(null)
    setName('')
    setSheet({ open: true, mode: 'create' })
  }

  function openEdit(row: CategoryRow) {
    setFormError(null)
    setName(row.name)
    setSheet({ open: true, mode: 'edit', row })
  }

  function openEditFromMobileDetail(row: CategoryRow) {
    setMobileDetailRow(null)
    queueMicrotask(() => openEdit(row))
  }

  function closeSheet() {
    setSheet({ open: false })
    setFormError(null)
    setName('')
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setBusy(true)
    try {
      if (!sheet.open) {
        return
      }
      if (sheet.mode === 'create') {
        const res = await createCategory({ name })
        setBusy(false)
        if (!res.ok) {
          setFormError(res.message)
          return
        }
        toast.success('Category created.')
        closeSheet()
        router.refresh()
        return
      }
      const res = await updateCategory({ id: sheet.row.id, name })
      setBusy(false)
      if (!res.ok) {
        setFormError(res.message)
        return
      }
      toast.success('Category saved.')
      closeSheet()
      router.refresh()
    } catch (err) {
      setBusy(false)
      setFormError(err instanceof Error ? err.message : 'Something went wrong.')
    }
  }

  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    router.push(buildListHref(1, searchDraft), { scroll: false })
  }

  const sheetTitle = !sheet.open
    ? '\u200b'
    : sheet.mode === 'create'
      ? 'Create category'
      : 'Edit category'

  const countLabel = q.trim()
    ? `${totalCount} match${totalCount === 1 ? '' : 'es'}`
    : `${totalCount} categories`

  return (
    <div className="gap-layout flex flex-col">
      <section className="border-border/60 bg-card shadow-soft overflow-hidden rounded-2xl border">
        <header className="border-border/60 gap-block px-section py-block flex flex-col border-b sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-inset min-w-0">
            <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
              Categories
            </h2>
            <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
              Manage catalog niches used when creating or filtering sites.
            </p>
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
                placeholder="Search by name…"
                value={searchDraft}
                onChange={(e) => {
                  const v = e.target.value
                  setSearchDraft(v)
                  if (!v.trim() && q.trim()) {
                    router.push(buildListHref(1, ''), { scroll: false })
                  }
                }}
                className="pr-3 pl-10"
                aria-label="Search categories"
              />
            </form>
            <span className="text-muted-foreground block w-full text-xs tabular-nums sm:inline sm:w-auto">
              {countLabel}
            </span>
            <Button
              type="button"
              variant="cta"
              size="default"
              className="h-10 min-h-10 w-full shrink-0 justify-center rounded-full sm:w-auto"
              onClick={openCreate}
            >
              <Plus className="size-4" aria-hidden />
              Create category
            </Button>
          </div>
        </header>

        <div className="flex flex-col">
          {totalCount === 0 ? (
            <div className="px-section py-block">
              <div className="gap-block py-hero flex flex-col items-center text-center">
                <span className="bg-primary-soft text-primary-ink flex size-14 items-center justify-center rounded-full">
                  <Tags className="size-7" aria-hidden />
                </span>
                <h3 className="font-display text-foreground text-lg font-semibold tracking-tight">
                  {q.trim() ? 'No categories match your search' : 'No categories yet'}
                </h3>
                <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                  {q.trim()
                    ? 'Try a different term or clear the search.'
                    : 'Create a category to use in the site catalog.'}
                </p>
                <div className="gap-inset mt-block mx-auto flex w-full max-w-sm flex-col items-stretch justify-center sm:flex-row sm:flex-wrap sm:justify-center">
                  {q.trim() ? (
                    <Link
                      href={buildListHref(1, '')}
                      scroll={false}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'default' }),
                        'h-10 min-h-10 w-full shrink-0 justify-center gap-2 rounded-full sm:w-auto'
                      )}
                    >
                      <RotateCcw className="size-4" aria-hidden />
                      Clear search
                    </Link>
                  ) : (
                    <Button
                      type="button"
                      variant="cta"
                      size="default"
                      className="h-10 min-h-10 w-full justify-center rounded-full sm:w-auto"
                      onClick={openCreate}
                    >
                      <Plus className="size-4" aria-hidden />
                      Create category
                    </Button>
                  )}
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
                        Name
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 px-4 font-medium">
                        Created
                      </TableHead>
                      <TableHead className="text-muted-foreground h-11 pr-5 pl-4 text-right font-medium">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {initialRows.map((row) => (
                      <TableRow
                        key={row.id}
                        className="group/category-row border-border hover:bg-transparent has-aria-expanded:bg-transparent data-[state=selected]:bg-transparent"
                      >
                        <TableCell className={CATEGORY_ROW_CELL}>
                          <p className="text-foreground font-medium">{row.name}</p>
                        </TableCell>
                        <TableCell className={CATEGORY_ROW_CELL_MUTED}>
                          {formatRelativeLastActive(row.created_at)}
                        </TableCell>
                        <TableCell
                          className={CATEGORY_ROW_CELL_ACTIONS}
                          data-row-actions
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              aria-label={`Manage category ${row.name}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'rounded-full opacity-80 hover:opacity-100'
                              )}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                  Manage
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEdit(row)} className="gap-2">
                                  <Pencil className="size-4" aria-hidden />
                                  Edit
                                </DropdownMenuItem>
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
                  {initialRows.map((row) => (
                    <li key={row.id}>
                      <div className="gap-block px-inset py-block flex items-start justify-between">
                        <button
                          type="button"
                          className="hover:bg-muted/40 focus-visible:ring-ring min-w-0 flex-1 rounded-lg text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
                          onClick={() => setMobileDetailRow(row)}
                          aria-label={`${row.name}, category details`}
                        >
                          <p className="text-foreground font-medium">{row.name}</p>
                          <p className="text-muted-foreground mt-inset text-xs tabular-nums">
                            Created {formatRelativeLastActive(row.created_at)}
                          </p>
                        </button>
                        <div data-row-actions className="shrink-0">
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              type="button"
                              aria-label={`Manage category ${row.name}`}
                              className={cn(
                                buttonVariants({ variant: 'ghost', size: 'icon' }),
                                'rounded-full opacity-80 hover:opacity-100'
                              )}
                            >
                              <MoreHorizontal className="size-4" aria-hidden />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="min-w-44">
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
                                  Manage
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => openEdit(row)} className="gap-2">
                                  <Pencil className="size-4" aria-hidden />
                                  Edit
                                </DropdownMenuItem>
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
        title={mobileDetailRow?.name ?? '\u200b'}
        description={
          mobileDetailRow
            ? `Created ${formatRelativeLastActive(mobileDetailRow.created_at)}`
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
                onClick={() => openEditFromMobileDetail(mobileDetailRow)}
              >
                <Pencil className="size-4" aria-hidden />
                Edit
              </Button>
            </>
          ) : null
        }
      >
        {mobileDetailRow ? (
          <div className="gap-inset flex flex-col">
            <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Name
            </p>
            <p className="text-foreground font-medium">{mobileDetailRow.name}</p>
            <p className="text-muted-foreground mt-block text-xs tabular-nums">
              Created {formatRelativeLastActive(mobileDetailRow.created_at)}
            </p>
          </div>
        ) : null}
      </SettingsRightSheet>

      <Sheet
        open={sheet.open}
        onOpenChange={(open) => {
          if (!open) {
            closeSheet()
          }
        }}
      >
        <SheetContent className={cn(SETTINGS_RIGHT_SHEET_CONTENT_CLASS)} side="right">
          <SheetHeader className="text-left">
            <SheetTitle>{sheetTitle}</SheetTitle>
            <SheetDescription>
              Name must be unique. A URL slug is generated automatically for internal use.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={onSubmit} className="gap-block flex flex-1 flex-col px-4">
            <div className="gap-inset flex flex-col">
              <Label htmlFor="category-name" className="text-foreground text-sm font-medium">
                Name
              </Label>
              <FormControlInput
                id="category-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                }}
                autoComplete="off"
                disabled={busy}
                required
              />
              {formError ? (
                <p className="text-destructive text-sm" role="alert">
                  {formError}
                </p>
              ) : null}
            </div>
            <SheetFooter className="gap-inset mt-auto flex flex-row px-0 pb-4">
              <Button type="button" variant="outline" onClick={closeSheet} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
