import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'

import { loginAndSaveSession } from './helpers/auth'
import { upsertTestSite, upsertTestUser, type TestRole } from './helpers/supabase'

const ROLES: TestRole[] = ['admin', 'manager', 'client', 'copywriter', 'sourcer']

export default async function globalSetup(): Promise<void> {
  // Ensure .auth directory exists for session state files
  const authDir = path.resolve(__dirname, '../.auth')
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true })

  // Create / refresh test users in local Supabase
  const userIds: Partial<Record<TestRole, string>> = {}
  for (const role of ROLES) {
    userIds[role] = await upsertTestUser(role)
  }

  // Seed test sites
  await upsertTestSite('e2e-active-site.com', 'active')
  await upsertTestSite('e2e-inactive-site.com', 'inactive')
  // Site owned by the test sourcer — used by edit-page tests
  await upsertTestSite('e2e-sourcer-edit-site.com', 'active', userIds.sourcer)

  // Log in as each role and save session to disk
  const browser = await chromium.launch()
  for (const role of ROLES) {
    const context = await browser.newContext()
    const page = await context.newPage()
    await loginAndSaveSession(page, role)
    await context.close()
  }
  await browser.close()
}
