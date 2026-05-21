import path from 'node:path'
import type { Page } from '@playwright/test'

import { TEST_PASSWORD, TEST_USERS, type TestRole } from './supabase'

/** Path to Playwright storage state file for a given role. */
export function storageStatePath(role: TestRole) {
  return path.resolve(__dirname, `../../.auth/${role}.json`)
}

/**
 * Log in via the UI and save session state to disk.
 * Call once per role in the `setup` project.
 */
export async function loginAndSaveSession(page: Page, role: TestRole) {
  const { email } = TEST_USERS[role]
  await page.goto('/auth/login')
  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in|log in/i }).click()
  await page.waitForURL('**/dashboard**', { timeout: 15_000 })
  await page.context().storageState({ path: storageStatePath(role) })
}

/**
 * Restore a saved session for a role.
 * Use in `beforeEach` with `page.context().addCookies(...)` or via `storageState` in the project config.
 */
export async function restoreSession(page: Page, role: TestRole) {
  await page.context().storageState({ path: storageStatePath(role) })
}
