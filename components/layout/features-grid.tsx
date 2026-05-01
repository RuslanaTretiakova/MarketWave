import { BadgeCheck, Banknote, Database, ListTodo, Shield, UsersRound } from 'lucide-react'

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
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-[var(--marketing-nav-h)]"
    >
      <div className="gap-layout mx-auto grid max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
        <header className="max-w-md">
          <p className="mb-block font-mono text-xs font-semibold tracking-wide text-[var(--marketing-teal-accent)] uppercase">
            / 01 — BUILT FOR OPS
          </p>
          <h2 className="marketing-heading text-foreground text-3xl leading-tight font-semibold tracking-tight sm:text-4xl md:text-[2.75rem]">
            Built for link-building{' '}
            <span className="text-[var(--marketing-teal-accent)]">operations.</span>
          </h2>
          <p className="text-muted-foreground mt-layout font-sans text-base leading-relaxed">
            Fewer handoffs, fewer mistakes, and a single source of truth your whole team — and
            clients — can trust.
          </p>
        </header>

        <div
          className="border-border/70 grid overflow-hidden rounded-[28px] border bg-[var(--marketing-card)] font-sans shadow-[var(--shadow-elevated)] sm:grid-cols-2"
          style={{ boxShadow: 'var(--shadow-elevated)' }}
        >
          {features.map((f, idx) => (
            <div
              key={f.title}
              className="border-border/60 gap-block p-section relative flex flex-col border-r border-b [&:nth-child(2n)]:border-r-0 [&:nth-child(n+5)]:border-b-0"
            >
              <div className="gap-block flex items-start justify-between">
                <f.Icon className="text-primary size-5 shrink-0" aria-hidden />
                <span className="text-muted-foreground/70 font-mono text-xs tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="marketing-heading text-foreground text-lg leading-snug font-semibold">
                {f.title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
