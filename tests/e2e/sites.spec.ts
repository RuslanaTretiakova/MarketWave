import { expect, test } from '@playwright/test'

import { getAdminClient } from './helpers/supabase'
import { SiteEditPage } from './pages/SiteEditPage'
import { SitesCatalogPage } from './pages/SitesCatalogPage'

async function getSiteIdByDomain(domain: string): Promise<string> {
  const db = getAdminClient()
  const { data } = await db.from('sites').select('id').eq('domain', domain).single()
  if (!data) throw new Error(`E2E: site not found: ${domain}`)
  return data.id as string
}

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

// ---------------------------------------------------------------------------
// Edit page — access control
// ---------------------------------------------------------------------------
test.describe('Site edit page — admin', () => {
  test.use({ storageState: 'tests/.auth/admin.json' })

  test('admin can load the edit form for any site', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-active-site.com')
    const editPage = new SiteEditPage(page)
    await editPage.goto(siteId)
    await expect(editPage.form()).toBeVisible({ timeout: 8_000 })
  })

  test('admin can update a site and see success feedback', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-active-site.com')
    const editPage = new SiteEditPage(page)
    await editPage.goto(siteId)
    await editPage.fillPrice(120)
    await editPage.submit()
    await expect(editPage.successToast()).toBeVisible({ timeout: 10_000 })
  })
})

test.describe('Site edit page — sourcer', () => {
  test.use({ storageState: 'tests/.auth/sourcer.json' })

  test('sourcer can load edit form for their own site', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-sourcer-edit-site.com')
    const editPage = new SiteEditPage(page)
    await editPage.goto(siteId)
    await expect(editPage.form()).toBeVisible({ timeout: 8_000 })
  })

  test('sourcer cannot edit a site they do not own', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-active-site.com')
    await page.goto(`/sites/${siteId}/edit`)
    await expect(page.locator('form')).not.toBeVisible({ timeout: 6_000 })
  })
})

test.describe('Site edit page — client', () => {
  test.use({ storageState: 'tests/.auth/client.json' })

  test('client cannot access the edit page', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-active-site.com')
    await page.goto(`/sites/${siteId}/edit`)
    await expect(page.locator('form')).not.toBeVisible({ timeout: 6_000 })
  })
})

test.describe('Site edit page — manager', () => {
  test.use({ storageState: 'tests/.auth/manager.json' })

  test('manager cannot access the edit page', async ({ page }) => {
    const siteId = await getSiteIdByDomain('e2e-active-site.com')
    await page.goto(`/sites/${siteId}/edit`)
    await expect(page.locator('form')).not.toBeVisible({ timeout: 6_000 })
  })
})
