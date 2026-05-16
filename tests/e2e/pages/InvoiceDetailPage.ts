import type { Page } from '@playwright/test'

export class InvoiceDetailPage {
  constructor(private page: Page) {}

  async goto(invoiceId: string) {
    await this.page.goto(`/invoices/${invoiceId}`)
  }

  statusBadge() {
    return this.page.locator('[data-testid="invoice-status"], [class*="status-badge"]').first()
  }

  async clickSend() {
    await this.page.getByRole('button', { name: /send invoice/i }).click()
  }

  async clickMarkPaid() {
    await this.page.getByRole('button', { name: /mark.*paid|paid/i }).click()
  }

  async confirmDialog() {
    await this.page.getByRole('button', { name: /confirm|yes/i }).click()
  }
}
