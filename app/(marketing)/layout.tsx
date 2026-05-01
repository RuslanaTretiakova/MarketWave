import type { ReactNode } from 'react'

import { MarketingChrome } from '@/components/layout/marketing-chrome'
import { SiteFooter } from '@/components/layout/site-footer'
import { SiteNavbar } from '@/components/layout/site-navbar'

// Navbar reads auth via Supabase — avoid build-time prerender without env (e.g. CI).
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
