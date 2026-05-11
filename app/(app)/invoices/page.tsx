import { notFound } from 'next/navigation'

import { GenerateMonthlyInvoices } from '@/components/invoices/generate-monthly-invoices'
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
  client?: string | string[]
  status?: string | string[]
  billingPeriod?: string | string[]
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
  const clientRaw = searchParamFirstString(sp.client)
  const statusRaw = searchParamFirstString(sp.status)
  const billingPeriodRaw = searchParamFirstString(sp.billingPeriod)

  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)
  const client = clientRaw?.trim() ?? ''
  const status = INVOICE_STATUSES_ORDERED.includes(statusRaw as InvoiceStatus)
    ? (statusRaw as InvoiceStatus)
    : undefined
  const billingPeriod = billingPeriodRaw?.trim() || new Date().toISOString().slice(0, 7)

  const { rows, totalCount } = await loadInvoicesPage(supabase, profile.role, {
    page,
    client,
    status,
    billingPeriod,
  })

  return (
    <div className="space-y-block">
      {(profile.role === 'admin' || profile.role === 'manager') && <GenerateMonthlyInvoices />}
      <InvoicesList
        role={profile.role}
        rows={rows}
        totalCount={totalCount}
        page={page}
        client={client}
        status={status}
        billingPeriod={billingPeriod}
      />
    </div>
  )
}
