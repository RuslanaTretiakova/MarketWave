import type { ReactNode } from 'react'

export function MarketingChrome({ children }: { children: ReactNode }) {
  return <div className="marketing-grid-bg relative flex min-h-screen flex-col">{children}</div>
}
