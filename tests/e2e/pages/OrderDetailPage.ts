import type { Page } from '@playwright/test'

export class OrderDetailPage {
  constructor(private page: Page) {}

  async goto(orderId: string) {
    await this.page.goto(`/orders/${orderId}`)
  }

  statusBadge() {
    return this.page.locator('[data-testid="order-status"], [class*="status-badge"]').first()
  }

  async clickAction(name: RegExp | string) {
    await this.page.getByRole('button', { name }).click()
  }

  async fillPublishedUrl(url: string) {
    await this.page.getByLabel(/published url|live url/i).fill(url)
  }

  async confirmDialog() {
    await this.page.getByRole('button', { name: /confirm|yes|submit/i }).click()
  }

  successToast() {
    return this.page.locator('[data-sonner-toast], [class*="toast"]').first()
  }
}
