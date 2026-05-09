import { notFound } from 'next/navigation'

import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view'
import { loadInvoiceDetail } from '@/lib/invoices/load-invoices'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>
}) {
  const { invoiceId } = await params

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

  const invoice = await loadInvoiceDetail(supabase, profile.role, invoiceId)
  if (!invoice) notFound()

  return <InvoiceDetailView invoice={invoice} role={profile.role} />
}
