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
    badgeClass: 'bg-[#0b0e11] text-white ring-1 ring-white/12',
    items: ['Order #1042', 'Order #1043'],
  },
  {
    title: 'In progress',
    badgeClass: 'bg-[#0f766e] text-white',
    items: ['Order #1039'],
  },
  {
    title: 'Review',
    badgeClass: 'bg-[#f4d03f] text-[#1a1a12]',
    items: ['Order #1037'],
  },
  {
    title: 'Published',
    badgeClass: 'bg-[#ff5722] text-white',
    items: ['Order #1034', 'Order #1035'],
  },
] as const

const workflowAccent = '#ff6b43'

export function WorkflowSpotlight() {
  return (
    <section
      id="workflow"
      className="workflow-showcase-bg marketing-section-screen px-block py-layout sm:px-section scroll-mt-(--marketing-nav-h) text-[#e8eef4]"
    >
      <div className="max-w-marketing mx-auto">
        <div className="gap-layout lg:gap-x-layout lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-end">
          <div>
            <p
              className="mb-block font-mono text-[11px] font-semibold tracking-[0.18em] uppercase"
              style={{ color: workflowAccent }}
            >
              / 02 — Flow
            </p>
            <h2 className="font-display text-3xl leading-[1.12] font-semibold tracking-tight sm:text-4xl md:text-[2.5rem] md:leading-[1.1]">
              <span className="block text-white">One linear workflow.</span>
              <span className="mt-1 block text-white/38">Nothing falls through the cracks.</span>
            </h2>
          </div>
          <p className="font-sans text-base leading-relaxed text-[#b8c2ce] lg:pb-0.5">
            Every placement moves through the same six stages — visible to the team and the client.
          </p>
        </div>

        {/* Horizontal timeline — line + numbered tiles + accent dots (desktop) */}
        <div className="mt-layout lg:mt-section">
          <div className="relative">
            <div
              className="pointer-events-none absolute top-7 right-[5%] left-[5%] z-0 hidden h-px bg-[#2e353d] lg:block"
              aria-hidden
            />
            <ol className="gap-y-layout gap-x-block relative z-10 grid sm:grid-cols-2 lg:grid-cols-6">
              {steps.map((s, i) => (
                <li
                  key={s.label}
                  className="flex flex-col items-center text-center lg:items-start lg:text-left"
                >
                  <div className="mb-block lg:mb-layout flex min-h-14 w-full justify-center lg:justify-start">
                    <div className="relative inline-flex items-center">
                      <div className="flex size-14 shrink-0 items-center justify-center rounded-[10px] border border-white/12 bg-white shadow-[0_1px_0_rgb(255_255_255/0.06)]">
                        <span className="font-display text-[1.35rem] leading-none font-semibold tracking-tight text-[#0f1419] tabular-nums">
                          {i + 1}
                        </span>
                      </div>
                      <span
                        className="absolute top-1/2 left-full ml-2.5 size-[7px] -translate-y-1/2 rounded-full ring-[3px] ring-[#0b0e11] lg:ml-3.5"
                        style={{ backgroundColor: workflowAccent }}
                        aria-hidden
                      />
                    </div>
                  </div>
                  <p className="font-display text-base font-semibold tracking-tight text-white">
                    {s.label}
                  </p>
                  <p className="mt-inset max-w-[16rem] font-sans text-xs leading-snug text-[#8b98a8] lg:max-w-none">
                    {s.detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Status board */}
        <div className="mt-layout lg:mt-section p-block sm:p-section rounded-[28px] border border-white/8 bg-[#11151b] shadow-[inset_0_1px_0_rgb(255_255_255/0.04)]">
          <div className="mb-layout gap-block flex flex-wrap items-center justify-between font-sans">
            <p className="text-[11px] font-semibold tracking-[0.16em] text-[#8b98a8] uppercase">
              Status board · live
            </p>
            <p className="gap-inset flex items-center text-[11px] font-medium text-[#8b98a8]">
              <span
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: workflowAccent }}
                aria-hidden
              />
              synced
            </p>
          </div>
          <div className="gap-layout grid sm:grid-cols-2 lg:grid-cols-4">
            {boardColumns.map((col) => (
              <div
                key={col.title}
                className="gap-inset p-block flex flex-col rounded-2xl bg-[#161b23]/90 ring-1 ring-white/5"
              >
                <span
                  className={`px-block py-inset inline-flex w-fit shrink-0 rounded-md font-sans text-[10px] font-bold tracking-wide uppercase ${col.badgeClass}`}
                >
                  {col.title}
                </span>
                <ul className="gap-inset flex flex-col">
                  {col.items.map((item) => (
                    <li
                      key={item}
                      className="px-block py-block rounded-xl border border-white/6 bg-[#0f131a] font-sans text-xs font-medium text-[#dde4ec]"
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
