import type { ReactNode } from 'react'

import { MarketingChrome } from '@/components/layout/marketing-chrome'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteNavbar } from '@/components/layout/site-navbar'

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingChrome>
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </MarketingChrome>
  )
}
