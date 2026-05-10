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
    <div className="border-border gap-block px-section py-block lg:gap-section flex flex-col border-b last:border-b-0 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-inset min-w-0 lg:w-72 lg:shrink-0 lg:pr-0">
        <p className="text-foreground font-medium wrap-break-word">{item.site_domain}</p>
        <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
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
      <div className="gap-section flex w-full min-w-0 flex-1 flex-col sm:flex-row sm:flex-wrap sm:items-end">
        <div className="gap-inset flex min-w-0 flex-1 flex-col sm:max-w-44">
          <label className="text-muted-foreground text-xs">Publish date</label>
          <input
            type="date"
            className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
            value={item.publish_date ?? ''}
            min={new Date().toISOString().split('T')[0]}
            suppressHydrationWarning
            onChange={(e) => onPublishDateChange(item.id, e.target.value || null)}
            disabled={pending}
          />
        </div>
        <div className="gap-inset flex min-w-0 flex-1 flex-col sm:max-w-44">
          <label className="text-muted-foreground text-xs">Publication month</label>
          <input
            type="month"
            className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
            value={publishMonthInput}
            onChange={(e) => onDetailsChange(item.id, { publishMonth: e.target.value || null })}
            disabled={pending}
          />
        </div>
        <div className="gap-inset flex min-w-0 flex-1 flex-col sm:min-w-48">
          <label className="text-muted-foreground text-xs">Anchor text</label>
          <input
            type="text"
            className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
            value={item.anchor_text ?? ''}
            onChange={(e) => onDetailsChange(item.id, { anchorText: e.target.value })}
            disabled={pending}
            placeholder="e.g. best link building services"
          />
        </div>
        <div className="gap-inset flex min-w-0 flex-1 flex-col sm:min-w-48">
          <label className="text-muted-foreground text-xs">Target URL</label>
          <input
            type="url"
            className="border-border bg-background text-foreground h-9 w-full min-w-0 rounded-md border px-3 text-sm"
            value={item.target_url ?? ''}
            onChange={(e) => onDetailsChange(item.id, { targetUrl: e.target.value })}
            disabled={pending}
            placeholder="https://example.com/page"
          />
        </div>
        <div className="gap-inset flex min-w-0 flex-1 basis-full flex-col sm:min-w-[16rem] lg:basis-[min(100%,28rem)]">
          <label className="text-muted-foreground text-xs">Requirements</label>
          <textarea
            className="border-border bg-background text-foreground min-h-16 w-full min-w-0 rounded-md border px-3 py-2 text-sm"
            value={item.client_notes ?? ''}
            onChange={(e) => onDetailsChange(item.id, { clientNotes: e.target.value })}
            disabled={pending}
            placeholder="Topic, tone, banned words, etc."
          />
        </div>
        <div className="gap-inset flex shrink-0 flex-col items-end sm:ml-auto">
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
