const steps = [
  { label: 'Order', detail: 'Client selects sites and checks out.' },
  { label: 'Assign', detail: 'Ops assigns copy and sourcing.' },
  { label: 'Write', detail: 'Draft content in workflow.' },
  { label: 'Approve', detail: 'Client or PM approves.' },
  { label: 'Publish', detail: 'Live link and confirmation.' },
  { label: 'Invoice', detail: 'Bill and archive history.' },
] as const

const boardColumns = [
  {
    title: 'New',
    badgeClass: 'bg-foreground text-background',
    items: ['Order #1042', 'Order #1043'],
  },
  {
    title: 'In progress',
    badgeClass: 'bg-(--marketing-teal-deep) text-white',
    items: ['Order #1039'],
  },
  {
    title: 'Review',
    badgeClass: 'bg-(--marketing-yellow-underline) text-(--marketing-teal-deep)',
    items: ['Order #1037'],
  },
  {
    title: 'Published',
    badgeClass: 'bg-[#6b7280] text-white',
    items: ['Order #1034', 'Order #1035'],
  },
  {
    title: 'Paid',
    badgeClass: 'bg-cta text-cta-foreground',
    items: ['Order #1030'],
  },
] as const

export function WorkflowSpotlight() {
  return (
    <section
      id="workflow"
      className="marketing-section-screen marketing-grid-dark px-block py-layout sm:px-section bg-hsl-(--marketing-flow-dark) scroll-mt-(--marketing-nav-h) text-[#e8eef4]"
    >
      <div className="mx-auto max-w-6xl">
        <div className="gap-layout lg:grid lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="marketing-heading mb-block text-sm font-semibold tracking-wide text-[#ff8a5b] uppercase">
              / 02 — Flow
            </p>
            <h2 className="marketing-heading text-3xl leading-tight font-semibold tracking-tight text-white sm:text-4xl md:text-[2.5rem]">
              One linear workflow. Nothing falls through the cracks.
            </h2>
          </div>
          <p className="font-sans text-base leading-relaxed text-[#9ca8b8] lg:pb-1">
            Every placement moves through the same six stages — visible to the team and the client.
          </p>
        </div>

        {/* Timeline */}
        <div className="mt-layout lg:mt-section relative">
          <div
            className="absolute top-[22px] right-[8%] left-[8%] hidden h-px bg-[#2a3138] lg:block"
            aria-hidden
          />
          <ol className="gap-block grid sm:grid-cols-2 lg:grid-cols-6">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex flex-col items-center text-center">
                <div className="mb-block relative z-1 flex size-14 shrink-0 flex-col items-center justify-center rounded-2xl border border-[#2a3138] bg-white shadow-sm">
                  <span className="text-foreground font-sans text-lg font-bold">{i + 1}</span>
                  <span
                    className="bg-cta absolute -right-1 -bottom-1 size-2 rounded-full"
                    aria-hidden
                  />
                </div>
                <p className="marketing-heading text-base font-semibold text-white">{s.label}</p>
                <p className="mt-inset font-sans text-xs leading-snug text-[#9ca8b8]">{s.detail}</p>
              </li>
            ))}
          </ol>
        </div>

        {/* Kanban */}
        <div className="mt-layout p-block sm:p-section rounded-[24px] border border-[#2a3138] bg-[#12161c]">
          <div className="mb-layout gap-block flex flex-wrap items-center justify-between font-sans">
            <p className="text-[11px] font-semibold tracking-wider text-[#9ca8b8] uppercase">
              Status board · live
            </p>
            <p className="gap-inset flex items-center text-[11px] font-medium text-[#9ca8b8]">
              <span className="bg-cta size-2 shrink-0 rounded-full" aria-hidden />
              synced
            </p>
          </div>
          <div className="gap-block grid sm:grid-cols-2 lg:grid-cols-5">
            {boardColumns.map((col) => (
              <div key={col.title} className="gap-inset flex flex-col">
                <span
                  className={`px-block py-inset inline-flex w-fit rounded-full font-sans text-[10px] font-bold tracking-wide uppercase ${col.badgeClass}`}
                >
                  {col.title}
                </span>
                <ul className="gap-inset flex flex-col">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="px-block py-block rounded-xl border border-[#2a3138] bg-[#1a2028] font-sans text-xs font-medium text-[#e8eef4]"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
