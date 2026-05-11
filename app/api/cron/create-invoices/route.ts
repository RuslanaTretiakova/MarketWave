import { NextResponse } from 'next/server'

import { generateMonthlyInvoiceGroupsInternal } from '@/lib/invoices/invoice-actions'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET
  if (!configuredSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 500 })
  }

  const headerSecret = request.headers.get('x-cron-secret')
  const bearer = request.headers.get('authorization')
  const bearerSecret = bearer?.startsWith('Bearer ') ? bearer.slice(7).trim() : null
  const provided = headerSecret ?? bearerSecret

  if (!provided || provided !== configuredSecret) {
    return unauthorized()
  }

  const now = new Date()
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const result = await generateMonthlyInvoiceGroupsInternal(month)
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, month, grouped: result.grouped })
}
