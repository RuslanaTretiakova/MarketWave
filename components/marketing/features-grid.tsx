import { BadgeCheck, Banknote, Database, ListTodo, Shield, UsersRound } from 'lucide-react'

import { cn } from '@/lib/utils'

const features = [
  {
    title: 'Client self-service',
    description:
      'Clients see status, approve content, and track history without chasing email threads.',
    Icon: UsersRound,
  },
  {
    title: 'Roles that match the work',
    description:
      'Admin, manager, sourcer, copywriter, and client — each with clear responsibilities.',
    Icon: Shield,
  },
  {
    title: 'Site catalog & dedup',
    description: 'One structured catalog so sites are not double-sold or lost across tabs.',
    Icon: Database,
  },
  {
    title: 'Task assignment',
    description: 'Route orders to writers and sources with clear ownership at every step.',
    Icon: ListTodo,
  },
  {
    title: 'Approval to publish',
    description:
      'Structured review: content sent, changes, approval, then publish — enforced in the workflow.',
    Icon: BadgeCheck,
  },
  {
    title: 'Billing and history',
    description:
      'Invoices and order history stay attached to the same record from selection to paid.',
    Icon: Banknote,
  },
] as const

export function FeaturesGrid() {
  return (
    <section
      id="built-for-ops"
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-(--marketing-nav-h) bg-(--marketing-page-bg)"
    >
      <div className="max-w-marketing gap-layout mx-auto grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
        <header className="max-w-md lg:pt-1">
          <p className="mb-block font-mono text-xs font-semibold tracking-wide text-(--accent-teal-strong) uppercase">
            / 01 — BUILT FOR OPS
          </p>
          <h2 className="font-display text-foreground text-3xl leading-[1.12] font-semibold tracking-tight sm:text-4xl md:text-(--marketing-section-title-md)">
            Built for link-building <span className="text-(--accent-teal-strong)">operations.</span>
          </h2>
          <p className="text-foreground/72 mt-layout font-sans text-base leading-relaxed">
            Fewer handoffs, fewer mistakes, and a single source of truth your whole team — and
            clients — can trust.
          </p>
        </header>

        <div className="shadow-soft border-border/40 grid overflow-hidden rounded-[32px] border bg-(--marketing-card) font-sans sm:grid-cols-2">
          {features.map((f, idx) => (
            <div
              key={f.title}
              className={cn(
                'border-border/45 gap-block p-section relative flex flex-col border-r border-b transition-colors duration-200 hover:bg-(--marketing-row-hover) nth-[2n]:border-r-0 nth-[n+5]:border-b-0',
                idx === 2 ? 'bg-hsl-(--marketing-features-highlight)' : null
              )}
            >
              <div className="gap-block flex items-start justify-between">
                <f.Icon
                  className="size-5 shrink-0 stroke-[1.35] text-(--accent-teal-strong)"
                  aria-hidden
                />
                <span className="text-muted-foreground/70 font-mono text-xs tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="font-display text-foreground text-lg leading-snug font-semibold tracking-tight">
                {f.title}
              </h3>
              <p className="text-foreground/72 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
