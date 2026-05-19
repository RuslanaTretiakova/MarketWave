import { Card } from '@/components/ui/card'
import { SITE_STATUS_LABEL } from '@/lib/sites/site-status-labels'
import type { Database } from '@/lib/supabase/types'

type SiteStatus = Database['public']['Enums']['site_status']

export type SiteAuditHistoryItem = {
  id: string
  from_status: SiteStatus
  to_status: SiteStatus
  actor_user_id: string | null
  comment: string | null
  created_at: string
  actor: { full_name: string | null } | null
}

export function SiteAuditHistory({ history }: { history: SiteAuditHistoryItem[] }) {
  return (
    <Card className="p-section space-y-block">
      <h3 className="text-foreground text-base font-semibold">Status history</h3>
      {history.length === 0 ? (
        <p className="text-muted-foreground text-sm italic">No status transitions recorded yet.</p>
      ) : (
        <div className="space-y-inset">
          {history.map((item) => (
            <div key={item.id} className="border-border rounded-md border p-3 text-sm">
              <p className="text-foreground font-medium">
                {SITE_STATUS_LABEL[item.from_status]} {'->'} {SITE_STATUS_LABEL[item.to_status]}
              </p>
              <p className="text-muted-foreground">
                {item.actor?.full_name?.trim() || 'Admin'} &middot;{' '}
                {new Date(item.created_at).toLocaleString()}
              </p>
              {item.comment ? <p className="text-muted-foreground mt-1">{item.comment}</p> : null}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
