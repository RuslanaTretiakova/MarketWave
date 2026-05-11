/** Cart row shape needed to validate publication month at checkout. */
export type CartPublishMonthCheckItem = {
  publish_month: string | null
  sites: { domain: string } | null
}

/**
 * Every item must have `publish_month` set to the first calendar day of a month
 * (YYYY-MM-01), not before the current UTC month. Matches DB comments on `cart_items.publish_month`.
 */
export function validateCartPublishMonths(
  items: CartPublishMonthCheckItem[]
): { ok: true } | { ok: false; message: string } {
  for (const item of items) {
    const label = item.sites?.domain?.trim() || 'A cart item'
    const raw = item.publish_month
    if (raw == null || String(raw).trim() === '') {
      return {
        ok: false,
        message: `Set publication month for ${label} before placing your order.`,
      }
    }
    const d = String(raw).trim().slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return {
        ok: false,
        message: `Publication month for ${label} is invalid. Use a date like 2026-05-01.`,
      }
    }
    const [yy, mm, dd] = d.split('-').map((s) => Number(s))
    if (
      !Number.isFinite(yy) ||
      !Number.isFinite(mm) ||
      !Number.isFinite(dd) ||
      mm < 1 ||
      mm > 12 ||
      dd !== 1
    ) {
      return {
        ok: false,
        message: `Publication month for ${label} must be the first day of a month (e.g. 2026-05-01).`,
      }
    }
    const selected = new Date(Date.UTC(yy, mm - 1, 1))
    if (Number.isNaN(selected.getTime())) {
      return {
        ok: false,
        message: `Publication month for ${label} is not a valid calendar month.`,
      }
    }
    const now = new Date()
    const startOfThisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    if (selected < startOfThisMonth) {
      return {
        ok: false,
        message: `Publication month for ${label} cannot be in the past.`,
      }
    }
  }
  return { ok: true }
}
