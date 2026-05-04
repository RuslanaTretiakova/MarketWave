import { NextResponse } from 'next/server'

import { adminClient } from '@/lib/supabase/admin'
import { clientErrorPostOriginAllowed } from '@/lib/errors/client-error-post-origin'

import type { Json } from '@/lib/supabase/types'

const BODY_MAX = 4096
const LEVELS = new Set(['info', 'warn', 'error', 'critical'])

/** Ingest browser-reported failures into `public.error_logs` (service role; origin-guarded). */
export async function POST(request: Request) {
  if (!clientErrorPostOriginAllowed(request.headers.get('origin'))) {
    return new NextResponse(null, { status: 403 })
  }

  let parsed: Record<string, unknown>
  try {
    const raw = await request.text()
    const clipped = raw.length > BODY_MAX ? raw.slice(0, BODY_MAX) : raw
    parsed = JSON.parse(clipped) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const messageRaw = parsed.message
  if (typeof messageRaw !== 'string') {
    return NextResponse.json({ error: 'message required' }, { status: 400 })
  }

  const message = messageRaw.trim().slice(0, 4000)
  if (!message) {
    return NextResponse.json({ error: 'message empty' }, { status: 400 })
  }

  const levelRaw = parsed.level
  const level = typeof levelRaw === 'string' && LEVELS.has(levelRaw) ? levelRaw : 'error'

  const contextRaw = parsed.context
  const context = typeof contextRaw === 'string' ? contextRaw.trim().slice(0, 500) : null

  let payload: Json | null = null
  const p = parsed.payload
  if (p !== undefined && p !== null) {
    try {
      const s = JSON.stringify(p).slice(0, 6000)
      payload = JSON.parse(s) as Json
    } catch {
      payload = { payload_encoding_error: true } as Json
    }
  }

  try {
    const { error } = await adminClient.from('error_logs').insert({
      message,
      context,
      level,
      payload,
      user_id: null,
    })
    if (error) {
      return new NextResponse(null, { status: 503 })
    }
  } catch {
    return new NextResponse(null, { status: 503 })
  }

  return new NextResponse(null, { status: 204 })
}
