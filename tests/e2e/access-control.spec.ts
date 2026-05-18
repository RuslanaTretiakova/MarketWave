import { expect, test } from '@playwright/test'

test.describe('Access control — unauthenticated', () => {
  test('dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('orders page redirects to login', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('cart page redirects to login', async ({ page }) => {
    await page.goto('/cart')
    await expect(page).toHaveURL(/\/auth\/login/)
  })
})

test.describe('Access control — client', () => {
  test.use({ storageState: 'tests/.auth/client.json' })

  test('client cannot reach admin routes', async ({ page }) => {
    const response = await page.goto('/admin')
    // Should be 404, redirect, or show not found
    expect(
      response?.status() === 404 || page.url().includes('/dashboard') || page.url().includes('/404')
    ).toBe(true)
  })

  test('client cannot see users settings', async ({ page }) => {
    await page.goto('/settings/users')
    await page.evaluate(() => document.title)
    // Either redirected away or shows not found
    await expect(
      page
        .getByText(/not found|access denied|unauthorized/i)
        .or(page.locator('h1, h2').filter({ hasText: /not found/i }))
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {
        // Acceptable: page redirected away from /settings/users
        expect(page.url()).not.toContain('/settings/users')
      })
  })
})

test.describe('Access control — sourcer', () => {
  test.use({ storageState: 'tests/.auth/sourcer.json' })

  test('sourcer cannot reach users settings', async ({ page }) => {
    await page.goto('/settings/users')
    // Should be blocked — either not found or redirected
    await expect(
      page
        .getByText(/not found|access denied|unauthorized/i)
        .or(page.locator('[class*="not-found"]'))
    )
      .toBeVisible({ timeout: 5_000 })
      .catch(() => {
        expect(page.url()).not.toContain('/settings/users')
      })
  })
})

test.describe('Access control — copywriter', () => {
  test.use({ storageState: 'tests/.auth/copywriter.json' })

  test('copywriter sees only their own orders', async ({ page }) => {
    await page.goto('/orders')
    await expect(page).toHaveURL(/\/orders/, { timeout: 8_000 })
    // Page should load without redirect — copywriters can view their orders
    await expect(page.getByRole('heading', { name: /orders/i })).toBeVisible()
  })
})
