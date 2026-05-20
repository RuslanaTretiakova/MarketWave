import { adminClient } from '@/lib/supabase/admin'
import type { Json } from '@/lib/supabase/types'

export type DbErrorCode =
  | 'unique_violation' // 23505
  | 'fk_violation' // 23503
  | 'check_violation' // 23514
  | 'not_null_violation' // 23502
  | 'invalid_input' // 22P02
  | 'trigger_exception' // P0001 — trigger messages are already readable
  | 'unknown'

export type MappedDbError = { code: DbErrorCode; message: string }

const DEFAULT_MESSAGES: Record<DbErrorCode, string> = {
  unique_violation: 'This record already exists.',
  fk_violation: 'Cannot complete — this item is linked to existing data.',
  check_violation: 'The provided value is not allowed.',
  not_null_violation: 'A required field is missing.',
  invalid_input: 'Invalid format.',
  trigger_exception: '',
  unknown: 'An unexpected error occurred. Please try again.',
}

const POSTGRES_CODE_MAP: Record<string, DbErrorCode> = {
  '23505': 'unique_violation',
  '23503': 'fk_violation',
  '23514': 'check_violation',
  '23502': 'not_null_violation',
  '22P02': 'invalid_input',
  P0001: 'trigger_exception',
}

/**
 * Maps a raw Postgres/PostgREST error to a typed user-facing message.
 * Pass `hints` to override the default message for specific codes.
 */
export function mapDbError(
  error: { code?: string; message?: string } | null | undefined,
  hints?: Partial<Record<DbErrorCode, string>>
): MappedDbError {
  if (!error) return { code: 'unknown', message: DEFAULT_MESSAGES.unknown }

  const code: DbErrorCode = POSTGRES_CODE_MAP[error.code ?? ''] ?? 'unknown'

  if (hints?.[code]) return { code, message: hints[code]! }

  if (code === 'trigger_exception') {
    return { code, message: error.message || DEFAULT_MESSAGES.unknown }
  }

  return { code, message: DEFAULT_MESSAGES[code] }
}

/**
 * Writes a DB error to `error_logs` via service role.
 * Mirrors the pattern of `log-auth-error.ts`.
 */
export async function logDbError(opts: {
  context: string
  error: { code?: string; message?: string; details?: string } | null | undefined
  userId?: string | null
  payload?: Record<string, unknown> | null
}): Promise<void> {
  const { context, error, userId, payload } = opts

  let safe: Record<string, unknown> | null = {
    ...(payload ?? {}),
    db_code: error?.code,
    db_details: error?.details,
  }

  try {
    if (JSON.stringify(safe).length > 4000) safe = { truncated: true, db_code: error?.code }
  } catch {
    safe = { payload_error: true, db_code: error?.code }
  }

  const { error: insertErr } = await adminClient.from('error_logs').insert({
    level: 'error',
    context: context.slice(0, 500),
    message: (error?.message ?? 'unknown db error').slice(0, 4000),
    payload: safe as Json | null,
    user_id: userId ?? null,
  })

  if (insertErr) {
    console.error('[logDbError] DB write failed', insertErr.message)
  }
}
