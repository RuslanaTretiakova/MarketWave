import type { Page } from '@playwright/test'

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/auth/login')
  }

  async login(email: string, password: string) {
    await this.page.getByLabel(/email/i).fill(email)
    await this.page.getByLabel('Password', { exact: true }).fill(password)
    await this.page.getByRole('button', { name: /sign in|log in/i }).click()
  }

  get errorMessage() {
    return this.page.getByRole('alert').or(this.page.locator('[data-error]'))
  }
}
