/**
 * Runs `operation`. If it throws, runs each compensation in reverse order
 * (best-effort — compensation errors are suppressed), then re-throws the
 * original error.
 *
 * Usage:
 *   let insertedId: string | null = null
 *   await withRollback(
 *     async () => {
 *       const { data } = await adminClient.from('foo').insert(...).select('id').single()
 *       insertedId = data.id
 *       await adminClient.from('bar').update(...) // if this throws, foo row is deleted
 *     },
 *     [async () => { if (insertedId) await adminClient.from('foo').delete().eq('id', insertedId) }],
 *   )
 */
export async function withRollback<T>(
  operation: () => Promise<T>,
  compensations: Array<() => Promise<unknown>>
): Promise<T> {
  try {
    return await operation()
  } catch (err) {
    for (const compensate of [...compensations].reverse()) {
      await compensate().catch(() => {})
    }
    throw err
  }
}
