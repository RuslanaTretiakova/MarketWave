import type { ReactNode } from 'react'

import { MarketingChrome } from '@/components/marketing/marketing-chrome'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteNavbar } from '@/components/site/site-navbar'

export const dynamic = 'force-dynamic'

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingChrome>
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </MarketingChrome>
  )
}
