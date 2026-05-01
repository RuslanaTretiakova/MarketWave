import Link from 'next/link'

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { SITE_NAME } from '@/lib/brand'
import { cn } from '@/lib/utils'

export const metadata = {
  title: 'Dashboard',
}

const snapshots = [
  {
    title: 'Orders in flight',
    value: '—',
    hint: 'Statuses from new through published sync here once orders exist.',
  },
  {
    title: 'Sites in catalog',
    value: '—',
    hint: 'Curated inventory your team shops from — wired to Supabase next.',
  },
  {
    title: 'Pending approvals',
    value: '—',
    hint: 'Client and manager approvals surface here for faster turnaround.',
  },
] as const

export default function DashboardPage() {
  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">
          Welcome back to {SITE_NAME}
        </h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          Your ops hub for placements — pick sites from the catalog, run orders through workflow,
          and keep billing attached to every placement.
        </p>
      </div>
      <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-3">
        {snapshots.map((s) => (
          <Card key={s.title} size="sm">
            <CardHeader>
              <CardDescription>{s.title}</CardDescription>
              <CardTitle className="text-3xl font-semibold tabular-nums">{s.value}</CardTitle>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.hint}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
      <section className="border-border bg-muted/25 p-section rounded-xl border">
        <h3 className="text-foreground text-base font-semibold">Next steps</h3>
        <p className="text-muted-foreground mt-inset max-w-xl text-sm leading-relaxed">
          Explore the site catalog and cart from the sidebar — data layers connect to your Supabase
          schema when you are ready to wire queries.
        </p>
        <div className="mt-layout gap-inset flex flex-wrap">
          <Link
            href="/sites"
            className={cn(buttonVariants({ variant: 'default', size: 'default' }))}
          >
            Browse site catalog
          </Link>
          <Link
            href="/orders"
            className={cn(buttonVariants({ variant: 'outline', size: 'default' }))}
          >
            View orders
          </Link>
        </div>
      </section>
    </div>
  )
}
