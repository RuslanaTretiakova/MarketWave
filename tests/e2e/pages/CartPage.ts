import type { Page } from '@playwright/test'

export class CartPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/cart')
  }

  async gotoCheckout() {
    await this.page.goto('/cart/checkout')
  }

  cartItems() {
    return this.page.locator('[data-testid="cart-item"], [class*="cart-item"]')
  }

  async clickCheckout() {
    await this.page.getByRole('button', { name: /checkout|place order/i }).click()
  }

  async setPublishMonth(itemIndex: number, value: string) {
    const inputs = this.page.locator('input[type="month"], input[placeholder*="YYYY-MM"]')
    await inputs.nth(itemIndex).fill(value)
  }

  validationError() {
    return this.page.getByRole('alert').or(this.page.locator('[data-error]'))
  }
}
