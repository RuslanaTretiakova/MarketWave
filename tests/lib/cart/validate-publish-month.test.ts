import { describe, expect, it } from 'vitest'

import { validateCartPublishMonths } from '@/lib/cart/validate-publish-month'

function item(publish_month: string | null, domain = 'example.com') {
  return { publish_month, sites: { domain } }
}

const FAR_FUTURE = '2099-12-01'

describe('validateCartPublishMonths', () => {
  it('returns ok for empty cart', () => {
    expect(validateCartPublishMonths([])).toEqual({ ok: true })
  })

  it('returns ok for valid future first-of-month date', () => {
    expect(validateCartPublishMonths([item(FAR_FUTURE)])).toEqual({ ok: true })
  })

  it('fails when publish_month is null', () => {
    const result = validateCartPublishMonths([item(null)])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/Set publication month/)
  })

  it('fails when publish_month is empty string', () => {
    const result = validateCartPublishMonths([item('')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/Set publication month/)
  })

  it('fails for wrong format (not YYYY-MM-DD)', () => {
    const result = validateCartPublishMonths([item('05/2099')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/invalid/)
  })

  it('fails when day is not 01', () => {
    const result = validateCartPublishMonths([item('2099-12-15')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/first day/)
  })

  it('fails for month 00', () => {
    const result = validateCartPublishMonths([item('2099-00-01')])
    expect(result.ok).toBe(false)
  })

  it('fails for month 13', () => {
    const result = validateCartPublishMonths([item('2099-13-01')])
    expect(result.ok).toBe(false)
  })

  it('fails for past month', () => {
    const result = validateCartPublishMonths([item('2000-01-01')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toMatch(/past/)
  })

  it('includes domain name in error message', () => {
    const result = validateCartPublishMonths([item(null, 'myblog.com')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('myblog.com')
  })

  it('uses fallback label when domain is missing', () => {
    const result = validateCartPublishMonths([{ publish_month: null, sites: null }])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('A cart item')
  })

  it('fails on first invalid item when multiple items', () => {
    const result = validateCartPublishMonths([item(FAR_FUTURE), item(null, 'bad.com')])
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('bad.com')
  })

  it('passes when all items are valid', () => {
    const result = validateCartPublishMonths([item(FAR_FUTURE), item('2099-06-01', 'other.com')])
    expect(result).toEqual({ ok: true })
  })
})
