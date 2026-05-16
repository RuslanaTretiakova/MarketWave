import { expect, test } from '@playwright/test'

import { TEST_PASSWORD, TEST_USERS } from './helpers/supabase'
import { LoginPage } from './pages/LoginPage'

test.describe('Authentication', () => {
  test('login with valid credentials redirects to dashboard', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(TEST_USERS.client.email, TEST_PASSWORD)
    await expect(page).toHaveURL(/\/dashboard/)
  })

  test('login with wrong password shows error', async ({ page }) => {
    const login = new LoginPage(page)
    await login.goto()
    await login.login(TEST_USERS.client.email, 'wrongpassword')
    await expect(login.errorMessage).toBeVisible()
  })

  test('logout redirects to login page', async ({ browser }) => {
    const context = await browser.newContext({ storageState: 'tests/.auth/client.json' })
    const page = await context.newPage()
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /sign out|log out/i }).click()
    await expect(page).toHaveURL(/\/auth\/login/)
    await context.close()
  })

  test('unauthenticated user is redirected from dashboard to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/auth\/login/)
  })

  test('forgot password form shows confirmation after submit', async ({ page }) => {
    await page.goto('/auth/forgot-password')
    await page.getByLabel(/email/i).fill(TEST_USERS.client.email)
    await page.getByRole('button', { name: /reset|send/i }).click()
    // Should show a success message (email sent confirmation)
    await expect(page.getByText(/sent|check your email/i)).toBeVisible({ timeout: 10_000 })
  })
})
