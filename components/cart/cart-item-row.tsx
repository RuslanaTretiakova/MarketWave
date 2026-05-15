'use client'

import { useEffect, useState } from 'react'
import { ClipboardList, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { SITE_STATUS_LABEL } from '@/lib/cart/cart-site-availability'
import type { CartItemRow } from '@/lib/cart/load-cart'
import { cn } from '@/lib/utils'

const DEBOUNCE_MS = 600

export function CartItemRow({
  item,
  onRemove,
  onDetailsChange,
  onCreateOrder,
  pending,
  creatingOrder,
}: {
  item: CartItemRow
  onRemove: (id: string) => void
  onDetailsChange: (
    id: string,
    details: {
      publishMonth?: string | null
      anchorText?: string | null
      clientNotes?: string | null
    }
  ) => void
  onCreateOrder: (id: string) => void
  pending: boolean
  creatingOrder: boolean
}) {
  const siteIsActive = item.site_status === 'active'

  const [monthDraft, setMonthDraft] = useState(() =>
    item.publish_month ? item.publish_month.slice(0, 7) : ''
  )
  const [anchorDraft, setAnchorDraft] = useState(() => item.anchor_text ?? '')
  const [notesDraft, setNotesDraft] = useState(() => item.client_notes ?? '')

  useEffect(() => {
    const server = item.anchor_text ?? ''
    if (anchorDraft === server) return
    const id = window.setTimeout(() => {
      onDetailsChange(item.id, { anchorText: anchorDraft })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [anchorDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const server = item.client_notes ?? ''
    if (notesDraft === server) return
    const id = window.setTimeout(() => {
      onDetailsChange(item.id, { clientNotes: notesDraft })
    }, DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [notesDraft]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleMonthChange(value: string) {
    setMonthDraft(value)
    onDetailsChange(item.id, { publishMonth: value || null })
  }

  return (
    <Card className={cn('overflow-hidden p-0', !siteIsActive && 'ring-destructive/40')}>
      <div className="px-section py-block flex items-start justify-between gap-4">
        <div className="space-y-inset min-w-0">
          <p className="text-foreground text-base font-semibold wrap-break-word">
            {item.site_domain}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            {!siteIsActive ? (
              <span className="bg-destructive/15 text-destructive border-destructive/30 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                {SITE_STATUS_LABEL[item.site_status]}
              </span>
            ) : null}
            {item.site_category ? (
              <span className="bg-muted/70 text-foreground rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                {item.site_category}
              </span>
            ) : null}
            {item.site_dr !== null ? (
              <span className="whitespace-nowrap tabular-nums">DR {item.site_dr}</span>
            ) : null}
            <span className="whitespace-nowrap capitalize">{item.site_link_type}</span>
          </div>
        </div>
        <p className="text-foreground shrink-0 text-lg font-semibold tabular-nums">
          ${item.site_price.toFixed(2)}
        </p>
      </div>

      <div className="border-border gap-block px-section py-block border-t">
        <div className="gap-block grid grid-cols-1 sm:grid-cols-2">
          <div className="gap-inset flex flex-col">
            <label className="text-muted-foreground text-xs">Publication month</label>
            <input
              type="month"
              className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
              value={monthDraft}
              onChange={(e) => handleMonthChange(e.target.value)}
            />
          </div>
          <div className="gap-inset flex flex-col">
            <label className="text-muted-foreground text-xs">Anchor text</label>
            <input
              type="text"
              className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
              value={anchorDraft}
              onChange={(e) => setAnchorDraft(e.target.value)}
              placeholder="e.g. best link building services"
            />
          </div>
        </div>
        <div className="gap-inset mt-block flex flex-col">
          <label className="text-muted-foreground text-xs">Requirements</label>
          <textarea
            className="border-border bg-background text-foreground min-h-16 w-full min-w-0 rounded-md border px-3 py-2 text-sm"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Topic, tone, banned words, etc."
          />
        </div>
      </div>

      <div className="border-border px-section gap-inset flex h-10 items-center justify-end border-t">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive gap-1.5"
          onClick={() => onRemove(item.id)}
          disabled={pending || creatingOrder}
          aria-label={`Remove ${item.site_domain} from cart`}
        >
          <Trash2 className="size-4 shrink-0" />
          <span>Remove</span>
        </Button>
        <Button
          type="button"
          variant="cta"
          size="sm"
          className="gap-1.5"
          onClick={() => onCreateOrder(item.id)}
          disabled={pending || creatingOrder || !siteIsActive}
          title={!siteIsActive ? 'Site must be Active to create an order.' : undefined}
          aria-label={`Create order for ${item.site_domain}`}
        >
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          <span>{creatingOrder ? 'Creating…' : 'Create order'}</span>
        </Button>
      </div>
    </Card>
  )
}
