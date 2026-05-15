import { NextResponse } from 'next/server'

import { adminClient } from '@/lib/supabase/admin'

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
  // Generate invoices for the previous month
  const prevMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const billingMonth = prevMonth.toISOString().slice(0, 10)

  const { data, error } = await adminClient.rpc('generate_monthly_invoices', {
    p_billing_month: billingMonth,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, billing_month: billingMonth, count: data })
}
