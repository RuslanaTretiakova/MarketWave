import { Suspense, type ReactNode } from 'react'

import { MarketingChrome } from '@/components/marketing/marketing-chrome'
import { SiteFooter } from '@/components/site/site-footer'
import { SiteNavbar } from '@/components/site/site-navbar'
import { SiteNavbarSkeleton } from '@/components/site/site-navbar-skeleton'

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MarketingChrome>
      <Suspense fallback={<SiteNavbarSkeleton />}>
        <SiteNavbar />
      </Suspense>
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </MarketingChrome>
  )
}
