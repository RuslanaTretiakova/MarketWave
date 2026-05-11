import { NextResponse } from 'next/server'

import { runInviteReminderCronInternal } from '@/lib/auth/invite-reminder-cron'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

async function handleCron(request: Request) {
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

  const result = await runInviteReminderCronInternal()
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    skipped: result.skipped,
    errors: result.errors,
    scanned: result.scanned,
  })
}

/** Vercel Cron invokes GET with `Authorization: Bearer` when `CRON_SECRET` is set. */
export async function GET(request: Request) {
  return handleCron(request)
}

/** Manual or external schedulers can POST with the same secret headers. */
export async function POST(request: Request) {
  return handleCron(request)
}
