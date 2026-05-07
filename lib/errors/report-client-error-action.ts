'use server'

import type { Json } from '@/lib/supabase/types'

import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const LEVELS = new Set(['info', 'warn', 'error', 'critical'])

export async function reportClientErrorFromSession(input: {
  message: string
  context?: string | null
  level?: string
  payload?: Json | null
}): Promise<{ ok: true } | { ok: false }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { ok: false }
  }

  const message = input.message.trim().slice(0, 4000)
  if (!message) {
    return { ok: false }
  }

  const level = input.level && LEVELS.has(input.level) ? input.level : 'error'
  const context = input.context?.trim().slice(0, 500) ?? null

  let payload = input.payload ?? null
  try {
    if (payload != null && JSON.stringify(payload).length > 8000) {
      payload = { truncated: true } as Json
    }
  } catch {
    payload = { payload_error: true } as Json
  }

  const { error } = await adminClient.from('error_logs').insert({
    message,
    context,
    level,
    payload,
    user_id: user.id,
  })

  return error ? { ok: false } : { ok: true }
}
