'use client'

import { ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'
import type { ChangeEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { PageHeader } from '@/components/ui/page-header'
import {
  monthStepRange,
  type EarningsRange,
  type EarningsSummary,
  type SourcerFilterOption,
} from '@/lib/earnings/load-earnings'
import type { Database } from '@/lib/supabase/types'

function money(v: number): string {
  return `$${v.toFixed(2)}`
}

type UserRole = Database['public']['Enums']['user_role']

function toMonthValue(dateKey: string): string {
  return dateKey.slice(0, 7)
}

function previousMonthValue(dateKey: string): string {
  const date = new Date(`${dateKey.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return toMonthValue(dateKey)
  const prev = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1))
  return prev.toISOString().slice(0, 7)
}

function startOfMonth(monthValue: string): string {
  return `${monthValue}-01`
}

function nextMonthStart(monthValue: string): string {
  const date = new Date(`${monthValue}-01T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return startOfMonth(monthValue)
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1))
    .toISOString()
    .slice(0, 10)
}

function buildHref(
  pathname: string,
  params: { from: string; to: string; sourcerId?: string | null }
): string {
  const sp = new URLSearchParams()
  sp.set('from', params.from)
  sp.set('to', params.to)
  if (params.sourcerId) sp.set('sourcerId', params.sourcerId)
  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

export function EarningsView({
  title,
  role,
  range,
  selectedSourcerId,
  sourcerOptions,
  summary,
}: {
  title: string
  role: UserRole
  range: EarningsRange
  selectedSourcerId: string | null
  sourcerOptions: SourcerFilterOption[]
  summary: EarningsSummary
}) {
  const pathname = usePathname()
  const router = useRouter()
  const canFilterBySourcer = role === 'admin' || role === 'manager'
  const fromMonth = toMonthValue(range.from)
  const toMonth = previousMonthValue(range.to)

  function handleSourcerChange(e: ChangeEvent<HTMLSelectElement>) {
    const nextSourcerId = e.target.value || null
    router.push(buildHref(pathname, { from: range.from, to: range.to, sourcerId: nextSourcerId }))
  }

  function handleFromMonthChange(e: ChangeEvent<HTMLInputElement>) {
    const nextFromMonth = e.target.value
    if (!nextFromMonth) return
    router.push(
      buildHref(pathname, {
        from: startOfMonth(nextFromMonth),
        to: nextMonthStart(toMonth),
        sourcerId: canFilterBySourcer ? selectedSourcerId : null,
      })
    )
  }

  function handleToMonthChange(e: ChangeEvent<HTMLInputElement>) {
    const nextToMonth = e.target.value
    if (!nextToMonth) return
    router.push(
      buildHref(pathname, {
        from: startOfMonth(fromMonth),
        to: nextMonthStart(nextToMonth),
        sourcerId: canFilterBySourcer ? selectedSourcerId : null,
      })
    )
  }

  function shiftByMonth(delta: number) {
    const next = monthStepRange(range, delta)
    router.push(
      buildHref(pathname, {
        from: next.from,
        to: next.to,
        sourcerId: canFilterBySourcer ? selectedSourcerId : null,
      })
    )
  }

  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <PageHeader
        title={title}
        description="Earnings are aggregated from order prices in the selected month range."
      />

      <div className="border-border/60 bg-card overflow-hidden rounded-2xl border">
        <div className="px-section py-block border-border/60 bg-muted/20 border-b">
          <div className="text-muted-foreground gap-inset mb-inset flex items-center text-xs font-medium">
            <Filter className="size-3.5 shrink-0" aria-hidden />
            <span>Filters</span>
          </div>
          <div className="gap-block flex flex-col sm:flex-row sm:flex-wrap sm:items-end">
            <FilterInput
              type="month"
              value={fromMonth}
              onChange={handleFromMonthChange}
              className="sm:w-[180px]"
              aria-label="From month"
            />
            <FilterInput
              type="month"
              value={toMonth}
              onChange={handleToMonthChange}
              className="sm:w-[180px]"
              aria-label="To month"
            />
            {canFilterBySourcer ? (
              <FilterSelect
                value={selectedSourcerId ?? ''}
                onChange={handleSourcerChange}
                className="sm:w-[260px]"
              >
                <option value="">All sourcers</option>
                {sourcerOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>
            ) : null}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => shiftByMonth(-1)}>
                <ChevronLeft className="mr-1 size-4" aria-hidden />
                Prev Month
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => shiftByMonth(1)}>
                Next Month
                <ChevronRight className="ml-1 size-4" aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="gap-block grid sm:grid-cols-2">
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Total earnings</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {money(summary.totalEarnings)}
          </p>
        </Card>
        <Card className="p-section">
          <p className="text-muted-foreground text-sm">Orders count</p>
          <p className="text-foreground mt-inset text-2xl font-semibold tabular-nums">
            {summary.ordersCount}
          </p>
        </Card>
      </div>
    </div>
  )
}
