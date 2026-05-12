'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, useTransition } from 'react'

import { FilterSelect } from '@/components/ui/filter-bar'
import { searchProfilesForChatAction } from '@/lib/chat/search-participants'
import { cn } from '@/lib/utils'

export function ChatsToolbar({ className }: { className?: string }) {
  const router = useRouter()
  const sp = useSearchParams()
  const [, startTransition] = useTransition()

  const withParam = sp.get('with') ?? ''
  const channel = sp.get('channel') ?? 'all'
  const status = sp.get('status') ?? 'all'
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

  return (
    <div
      className={cn(
        'border-border bg-muted/10 gap-inset p-block flex flex-col border-b',
        className
      )}
    >
      <div className="gap-inset flex flex-wrap items-end">
        <label className="flex min-w-35 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Participant</span>
          <div className="relative">
            <input
              type="search"
              value={participantQ}
              onChange={(e) => {
                setParticipantQ(e.target.value)
                setOpenHits(true)
              }}
              onFocus={() => setOpenHits(true)}
              onBlur={() => setTimeout(() => setOpenHits(false), 150)}
              placeholder="Search name or email…"
              className="border-border bg-background text-foreground h-10 w-full rounded-full border px-3 text-sm"
            />
            {openHits && hits.length > 0 && (
              <ul className="border-border bg-background absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-md border py-1 text-sm shadow-md">
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
          {withParam ? (
            <button
              type="button"
              className="text-primary text-xs font-medium underline-offset-2 hover:underline"
              onClick={() =>
                pushParams((p) => {
                  p.delete('with')
                })
              }
            >
              Clear participant filter
            </button>
          ) : null}
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Category</span>
          <FilterSelect
            className="h-10 min-w-32.5"
            value={channel}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (v === 'all') p.delete('channel')
                else p.set('channel', v)
              })
            }
          >
            <option value="all">All</option>
            <option value="standard">Standard</option>
            <option value="support">Support</option>
            <option value="sales">Sales</option>
          </FilterSelect>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Status</span>
          <FilterSelect
            className="h-10 min-w-30"
            value={status}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (v === 'all') p.delete('status')
                else p.set('status', v)
              })
            }
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </FilterSelect>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Sort</span>
          <FilterSelect
            className="h-10 min-w-35"
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
        </label>
      </div>

      <div className="gap-inset flex flex-wrap items-end">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Created from</span>
          <input
            type="date"
            value={from}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (!v) p.delete('from')
                else p.set('from', v)
              })
            }
            className="border-border bg-background text-foreground h-10 rounded-full border px-3 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted-foreground text-xs">Created to</span>
          <input
            type="date"
            value={to}
            onChange={(e) =>
              pushParams((p) => {
                const v = e.target.value
                if (!v) p.delete('to')
                else p.set('to', v)
              })
            }
            className="border-border bg-background text-foreground h-10 rounded-full border px-3 text-sm"
          />
        </label>
        <Link
          href="/chats"
          className="text-muted-foreground hover:text-foreground text-sm underline-offset-2 hover:underline"
        >
          Reset filters
        </Link>
      </div>
    </div>
  )
}
