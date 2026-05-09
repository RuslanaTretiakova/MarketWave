import { NextResponse } from 'next/server'

import { InvoicePdfDocument } from '@/components/invoices/invoice-pdf-document'
import { loadInvoiceDetail } from '@/lib/invoices/load-invoices'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  const role = profile?.role

  if (!role) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const invoice = await loadInvoiceDetail(supabase, role, invoiceId)
  if (!invoice) {
    return new NextResponse('Not found', { status: 404 })
  }

  const allowed =
    role === 'admin' || role === 'manager' || (role === 'client' && invoice.client_id === user.id)
  if (!allowed) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  const { renderToBuffer } = await import('@react-pdf/renderer')
  const buffer = await renderToBuffer(<InvoicePdfDocument invoice={invoice} />)

  const filename = `invoice-${invoice.id.slice(0, 8)}.pdf`
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
