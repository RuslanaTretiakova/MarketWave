const roles = [
  {
    num: '01',
    name: 'Admin',
    description: 'Configures the workspace, billing, and permissions for the whole org.',
  },
  {
    num: '02',
    name: 'Manager',
    description: 'Owns delivery: assigns work, watches the board, unblocks the team.',
  },
  {
    num: '03',
    name: 'Sourcer',
    description: 'Adds sites to the catalog, prevents duplicates, negotiates placements.',
  },
  {
    num: '04',
    name: 'Copywriter',
    description: 'Drafts content in-workflow with clear briefs and anchor requirements.',
  },
  {
    num: '05',
    name: 'Client',
    description: 'Self-service ordering, approval, history — without chasing email.',
  },
] as const

export function LandingRoles() {
  return (
    <section
      id="roles"
      className="marketing-section-screen px-block py-layout sm:px-section scroll-mt-(--marketing-nav-h) bg-(--marketing-page-bg)"
    >
      <div className="max-w-marketing mx-auto text-center">
        <p className="mb-block font-mono text-xs font-semibold tracking-wide text-(--marketing-teal-accent) uppercase">
          / 03 — ROLES
        </p>
        <h2 className="marketing-heading text-foreground mx-auto max-w-3xl text-3xl leading-tight font-semibold tracking-tight sm:text-4xl md:text-[2.75rem]">
          Five roles. <span className="text-(--marketing-teal-accent)">One record.</span>
          <span className="block">Zero confusion.</span>
        </h2>
        <p className="text-muted-foreground mt-layout mx-auto max-w-2xl font-sans text-base leading-relaxed">
          Each role sees what they need and nothing they don&apos;t — enforced by the workflow, not
          by convention.
        </p>

        <div className="border-border/70 mt-layout shadow-soft overflow-hidden rounded-[28px] border bg-(--marketing-card) text-left font-sans">
          {roles.map((r) => (
            <div
              key={r.num}
              className="border-border/60 gap-inset px-section py-layout sm:gap-layout flex cursor-default flex-col border-b transition-colors duration-200 last:border-b-0 hover:bg-(--marketing-row-hover) sm:flex-row sm:items-start"
            >
              <span className="text-muted-foreground/80 w-8 shrink-0 pt-1 font-mono text-xs tabular-nums">
                {r.num}
              </span>
              <p className="marketing-heading text-foreground w-full shrink-0 text-xl font-semibold sm:w-44">
                {r.name}
              </p>
              <p className="text-muted-foreground flex-1 text-sm leading-relaxed">
                {r.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
