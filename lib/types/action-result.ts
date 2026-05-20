/**
 * Shared discriminated-union result type for Server Actions.
 * Use for new actions only — existing actions keep their inline unions.
 *
 * Usage:
 *   ActionResult<void>                 → { ok: true } | { ok: false; message: string }
 *   ActionResult<{ orderId: string }>  → { ok: true; orderId: string } | { ok: false; message: string }
 */
export type ActionResult<T extends Record<string, unknown> | void = void> =
  | (T extends void ? { ok: true } : { ok: true } & T)
  | { ok: false; message: string }

/** Convenience constructors — avoid repetitive `as const` casts in action bodies. */
export const ok = <T extends Record<string, unknown>>(data: T): { ok: true } & T => ({
  ok: true,
  ...data,
})

export const okVoid = (): { ok: true } => ({ ok: true })

export const fail = (message: string): { ok: false; message: string } => ({
  ok: false,
  message,
})
