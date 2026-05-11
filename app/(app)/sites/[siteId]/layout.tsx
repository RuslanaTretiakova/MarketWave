import type { ReactNode } from 'react'

import { SiteDetailBreadcrumbs } from '@/components/sites/site-detail-breadcrumbs'
import { createClient } from '@/lib/supabase/server'

export default async function SiteIdLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ siteId: string }>
}) {
  const { siteId } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('sites').select('domain').eq('id', siteId).maybeSingle()

  if (!data?.domain) {
    return <>{children}</>
  }

  return (
    <>
      <SiteDetailBreadcrumbs domain={data.domain} siteId={siteId} />
      {children}
    </>
  )
}
