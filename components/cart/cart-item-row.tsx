'use client'

import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { CartItemRow } from '@/lib/cart/load-cart'

export function CartItemRow({
  item,
  onRemove,
  onPublishDateChange,
  onDetailsChange,
  pending,
}: {
  item: CartItemRow
  onRemove: (id: string) => void
  onPublishDateChange: (id: string, date: string | null) => void
  onDetailsChange: (
    id: string,
    details: {
      publishMonth?: string | null
      anchorText?: string | null
      targetUrl?: string | null
      clientNotes?: string | null
    }
  ) => void
  pending: boolean
}) {
  const publishMonthInput = item.publish_month ? item.publish_month.slice(0, 7) : ''

  return (
    <div className="border-border gap-block px-section py-block flex flex-col border-b last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-inset min-w-0 flex-1">
        <p className="text-foreground truncate font-medium">{item.site_domain}</p>
        <div className="text-muted-foreground gap-x-section gap-y-inset flex flex-wrap text-sm">
          {item.site_category && <span>{item.site_category}</span>}
          {item.site_dr !== null && <span>DR {item.site_dr}</span>}
          <span className="capitalize">{item.site_link_type}</span>
        </div>
      </div>
      <div className="gap-section flex items-center">
        <div className="gap-inset flex flex-col">
          <label className="text-muted-foreground text-xs">Publish date</label>
          <input
            type="date"
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            value={item.publish_date ?? ''}
            min={new Date().toISOString().split('T')[0]}
            suppressHydrationWarning
            onChange={(e) => onPublishDateChange(item.id, e.target.value || null)}
            disabled={pending}
          />
        </div>
        <div className="gap-inset flex flex-col">
          <label className="text-muted-foreground text-xs">Publication month</label>
          <input
            type="month"
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            value={publishMonthInput}
            onChange={(e) => onDetailsChange(item.id, { publishMonth: e.target.value || null })}
            disabled={pending}
          />
        </div>
        <div className="gap-inset flex min-w-[240px] flex-col">
          <label className="text-muted-foreground text-xs">Anchor text</label>
          <input
            type="text"
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            value={item.anchor_text ?? ''}
            onChange={(e) => onDetailsChange(item.id, { anchorText: e.target.value })}
            disabled={pending}
            placeholder="e.g. best link building services"
          />
        </div>
        <div className="gap-inset flex min-w-[260px] flex-col">
          <label className="text-muted-foreground text-xs">Target URL</label>
          <input
            type="url"
            className="border-border bg-background text-foreground h-9 rounded-md border px-3 text-sm"
            value={item.target_url ?? ''}
            onChange={(e) => onDetailsChange(item.id, { targetUrl: e.target.value })}
            disabled={pending}
            placeholder="https://example.com/page"
          />
        </div>
        <div className="gap-inset flex min-w-[280px] flex-col">
          <label className="text-muted-foreground text-xs">Requirements</label>
          <textarea
            className="border-border bg-background text-foreground min-h-16 rounded-md border px-3 py-2 text-sm"
            value={item.client_notes ?? ''}
            onChange={(e) => onDetailsChange(item.id, { clientNotes: e.target.value })}
            disabled={pending}
            placeholder="Topic, tone, banned words, etc."
          />
        </div>
        <div className="gap-inset flex flex-col items-end">
          <p className="text-foreground font-semibold tabular-nums">
            ${item.site_price.toFixed(2)}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            disabled={pending}
            aria-label={`Remove ${item.site_domain} from cart`}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
