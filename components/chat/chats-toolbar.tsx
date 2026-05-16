'use client'

import Link from 'next/link'
import { Filter, RotateCcw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { FilterInput, FilterSelect } from '@/components/ui/filter-bar'
import { searchProfilesForChatAction } from '@/lib/chat/search-participants'
import { cn } from '@/lib/utils'

export function ChatsToolbar({ className }: { className?: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const withParam = sp.get('with') ?? ''
  const channel = sp.get('channel') ?? 'all'
  const status = sp.get('status') ?? 'active'
  const sort = sp.get('sort') ?? 'activity'
  const from = sp.get('from') ?? ''
  const to = sp.get('to') ?? ''

  const [participantQ, setParticipantQ] = useState('')
  const [hits, setHits] = useState<{ id: string; label: string }[]>([])
  const [openHits, setOpenHits] = useState(false)

  const pushParams = useCallback(
    (mutate: (p: URLSearchParams) => void) => {
      const p = new URLSearchParams(sp.toString())
      mutate(p)
      const q = p.toString()
      startTransition(() => router.push(q ? `/chats?${q}` : '/chats'))
    },
    [router, sp]
  )

  useEffect(() => {
    const t = setTimeout(() => {
      void (async () => {
        if (participantQ.trim().length < 2) {
          setHits([])
          return
        }
        const res = await searchProfilesForChatAction(participantQ)
        if (!res.ok) return
        setHits(
          res.hits.map((h) => ({
            id: h.id,
            label: h.full_name?.trim() || h.email || h.id.slice(0, 8),
          }))
        )
      })()
    }, 250)
    return () => clearTimeout(t)
  }, [participantQ])

  const hasFilters =
    !!withParam || channel !== 'all' || status !== 'active' || sort !== 'activity' || !!from || !!to

  return (
    <div className={cn('px-section py-block gap-inset flex flex-wrap items-end', className)}>
      <div className="text-muted-foreground gap-inset mb-0.5 flex shrink-0 items-center text-xs font-medium">
        <Filter className="size-3.5 shrink-0" aria-hidden />
        <span>Filters</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Participant</span>
        <div className="relative">
          <FilterInput
            type="search"
            value={participantQ}
            onChange={(e) => {
              setParticipantQ(e.target.value)
              setOpenHits(true)
            }}
            onFocus={() => setOpenHits(true)}
            onBlur={() => setTimeout(() => setOpenHits(false), 150)}
            placeholder="Search…"
            aria-label="Search participant"
            className="h-8 w-auto max-w-44 min-w-0 rounded-full px-3 text-xs"
          />
          {openHits && hits.length > 0 && (
            <ul className="border-border bg-background absolute z-20 mt-1 max-h-48 w-48 overflow-auto rounded-md border py-1 text-xs shadow-md">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="hover:bg-muted w-full px-3 py-2 text-left"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      pushParams((p) => {
                        p.set('with', h.id)
                      })
                      setParticipantQ('')
                      setHits([])
                    }}
                  >
                    {h.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Category</span>
        <FilterSelect
          aria-label="Category"
          className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
          value={channel}
          onChange={(e) =>
            pushParams((p) => {
              const v = e.target.value
              if (v === 'all') p.delete('channel')
              else p.set('channel', v)
            })
          }
        >
          <option value="all">All categories</option>
          <option value="standard">Standard</option>
          <option value="support">Support</option>
          <option value="sales">Sales</option>
        </FilterSelect>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Status</span>
        <FilterSelect
          aria-label="Status"
          className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
          value={status}
          onChange={(e) =>
            pushParams((p) => {
              const v = e.target.value
              if (v === 'active') p.delete('status')
              else p.set('status', v)
            })
          }
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All (incl. archived)</option>
        </FilterSelect>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Sort</span>
        <FilterSelect
          aria-label="Sort"
          className="h-8 w-auto max-w-32 min-w-0 rounded-full px-1 text-xs"
          value={sort}
          onChange={(e) =>
            pushParams((p) => {
              const v = e.target.value
              if (v === 'activity') p.delete('sort')
              else p.set('sort', v)
            })
          }
        >
          <option value="activity">Latest activity</option>
          <option value="created">Date created</option>
        </FilterSelect>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-muted-foreground px-1 text-[10px] font-medium">Created</span>
        <div className="gap-inset flex">
          <FilterInput
            type="date"
            aria-label="Created from"
            value={from}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (!v) p.delete('from')
                else p.set('from', v)
              })
            }
            className="h-8 w-auto rounded-full px-3 text-xs"
          />
          <FilterInput
            type="date"
            aria-label="Created to"
            value={to}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (!v) p.delete('to')
                else p.set('to', v)
              })
            }
            className="h-8 w-auto rounded-full px-3 text-xs"
          />
        </div>
      </div>
      {hasFilters ? (
        <Link
          href="/chats"
          className={cn(
            buttonVariants({ variant: 'outline', size: 'sm' }),
            'ml-auto h-8 gap-2 self-end rounded-full px-3 text-xs'
          )}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Clear filters
        </Link>
      ) : null}
    </div>
  )
}
