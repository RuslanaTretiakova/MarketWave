import { notFound } from 'next/navigation'

import { InvoicesList } from '@/components/invoices/invoices-list'
import { INVOICE_STATUSES_ORDERED, type InvoiceStatus } from '@/lib/invoices/invoice-status-labels'
import { loadInvoicesPage } from '@/lib/invoices/load-invoices'
import { searchParamFirstString } from '@/lib/pagination/search-param-first-string'
import { adminClient } from '@/lib/supabase/admin'
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
  invoiceNumber?: string | string[]
  minAmount?: string | string[]
  maxAmount?: string | string[]
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
  const invoiceNumberRaw = searchParamFirstString(sp.invoiceNumber)
  const minAmountRaw = searchParamFirstString(sp.minAmount)
  const maxAmountRaw = searchParamFirstString(sp.maxAmount)

  const page = Math.max(1, Math.floor(Number(pageRaw)) || 1)
  const client = clientRaw?.trim() ?? ''
  const allowedStatuses = INVOICE_STATUSES_ORDERED
  const status = allowedStatuses.includes(statusRaw as InvoiceStatus)
    ? (statusRaw as InvoiceStatus)
    : undefined
  const billingPeriod = billingPeriodRaw?.trim() || undefined
  const invoiceNumber = invoiceNumberRaw?.trim() || undefined
  const minAmount = minAmountRaw ? Number(minAmountRaw) : undefined
  const maxAmount = maxAmountRaw ? Number(maxAmountRaw) : undefined

  let myClientsIds: string[] | undefined
  if (profile.role === 'manager') {
    const { data: assigned } = await adminClient
      .from('profiles')
      .select('id')
      .eq('account_manager_id', user.id)
      .eq('role', 'client')
    myClientsIds = (assigned ?? []).map((p) => p.id)
  }

  const { rows, totalCount } = await loadInvoicesPage(supabase, profile.role, {
    page,
    client,
    status,
    billingPeriod,
    invoiceNumber,
    minAmount: Number.isFinite(minAmount) ? minAmount : undefined,
    maxAmount: Number.isFinite(maxAmount) ? maxAmount : undefined,
    myClientsIds,
  })

  return (
    <InvoicesList
      role={profile.role}
      rows={rows}
      totalCount={totalCount}
      page={page}
      client={client}
      status={status}
      billingPeriod={billingPeriod}
      invoiceNumber={invoiceNumber}
      minAmount={minAmountRaw?.trim() || undefined}
      maxAmount={maxAmountRaw?.trim() || undefined}
    />
  )
}
