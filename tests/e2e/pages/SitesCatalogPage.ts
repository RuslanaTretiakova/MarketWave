import type { Page } from '@playwright/test'

export class SitesCatalogPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/sites')
  }

  siteRows() {
    return this.page.locator('tr, [data-testid="site-row"]')
  }

  async addToCart(domain: string) {
    const row = this.page.locator(
      `[data-testid="site-row"]:has-text("${domain}"), tr:has-text("${domain}")`
    )
    await row.getByRole('button', { name: /add to cart/i }).click()
  }

  async openStatusDialog(domain: string) {
    const row = this.page.locator(`tr:has-text("${domain}")`)
    await row.getByRole('button', { name: /status|activate|deactivate/i }).click()
  }

  async confirmStatusChange() {
    await this.page.getByRole('button', { name: /confirm|yes/i }).click()
  }
}
