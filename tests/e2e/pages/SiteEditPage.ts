import type { Page } from '@playwright/test'

export class SiteEditPage {
  constructor(private page: Page) {}

  async goto(siteId: string) {
    await this.page.goto(`/sites/${siteId}/edit`)
  }

  form() {
    return this.page.locator('form')
  }

  async fillDomain(domain: string) {
    await this.page.getByLabel(/domain/i).fill(domain)
  }

  async fillPrice(price: number) {
    await this.page.getByLabel(/price/i).fill(String(price))
  }

  async submit() {
    await this.page.getByRole('button', { name: /save|update/i }).click()
  }

  successToast() {
    return this.page.locator('[data-sonner-toast]').or(this.page.getByText(/saved|updated/i))
  }
}
