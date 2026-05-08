import { notFound } from 'next/navigation'

import { InvoicesList } from '@/components/invoices/invoices-list'
import { INVOICE_STATUSES_ORDERED, type InvoiceStatus } from '@/lib/invoices/invoice-status-labels'
import { loadInvoicesPage } from '@/lib/invoices/load-invoices'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Invoices',
}

type SearchParams = {
  page?: string | string[]
  q?: string | string[]
  status?: string | string[]
  dueFrom?: string | string[]
  dueTo?: string | string[]
}

export default async function InvoicesPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = await props.searchParams

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin' && profile?.role !== 'manager' && profile?.role !== 'client') {
    notFound()
  }

  const pageRaw = searchParamFirstString(sp.page)
  const qRaw = searchParamFirstString(sp.q)
  const statusRaw = searchParamFirstString(sp.status)
  const dueFromRaw = searchParamFirstString(sp.dueFrom)
  const dueToRaw = searchParamFirstString(sp.dueTo)

  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)
  const q = qRaw?.trim() ?? ''
  const status = INVOICE_STATUSES_ORDERED.includes(statusRaw as InvoiceStatus)
    ? (statusRaw as InvoiceStatus)
    : undefined
  const dueFrom = dueFromRaw?.trim() || undefined
  const dueTo = dueToRaw?.trim() || undefined

  const { rows, totalCount } = await loadInvoicesPage(supabase, profile.role, {
    page,
    q,
    status,
    dueFrom,
    dueTo,
  })

  return (
    <InvoicesList
      role={profile.role}
      rows={rows}
      totalCount={totalCount}
      page={page}
      q={q}
      status={status}
      dueFrom={dueFrom}
      dueTo={dueTo}
    />
  )
}
