import { expect, test } from '@playwright/test'

import { SitesCatalogPage } from './pages/SitesCatalogPage'

test.describe('Sites catalog — admin', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })

  test('admin can change site status', async ({ page }) => {
    const catalog = new SitesCatalogPage(page)
    await catalog.goto()
    await catalog.openStatusDialog('e2e-active-site.com')
    await catalog.confirmStatusChange()
    // After toggle, the status should change (active → inactive or back)
    await expect(
      page
        .getByText(/status.*updated|deactivated|activated/i)
        .or(page.locator('[data-sonner-toast]'))
    ).toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Sites catalog — client', () => {
  test.use({ storageState: 'tests/.auth/client.json' })

  test('client cannot see site management actions', async ({ page }) => {
    await page.goto('/sites')
    // Status change / edit buttons should not be visible for clients
    await expect(
      page.getByRole('button', { name: /deactivate|activate|change status/i })
    ).not.toBeVisible()
  })
})

test.describe('Sites catalog — sourcer', () => {
  test.use({ storageState: 'tests/.auth/sourcer.json' })

  test('sourcer can add a new site via form', async ({ page }) => {
    await page.goto('/sites')
    // Look for add/new site button
    const addBtn = page.getByRole('button', { name: /add site|new site|submit site/i })
    await expect(addBtn).toBeVisible()
    await addBtn.click()
    // Fill form fields
    await page.getByLabel(/domain/i).fill(`e2e-sourcer-site-${Date.now()}.com`)
    await page.getByLabel(/price/i).fill('150')
    await page
      .getByRole('button', { name: /submit|save|add/i })
      .last()
      .click()
    await expect(
      page.locator('[data-sonner-toast]').or(page.getByText(/site.*added|submitted/i))
    ).toBeVisible({ timeout: 10_000 })
  })
})
