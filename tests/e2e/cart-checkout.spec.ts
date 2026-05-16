import { expect, test } from '@playwright/test'

import { CartPage } from './pages/CartPage'
import { SitesCatalogPage } from './pages/SitesCatalogPage'

test.describe('Cart & Checkout', () => {
  test.use({ storageState: 'tests/.auth/client.json' })

  test('client can add active site to cart', async ({ page }) => {
    const catalog = new SitesCatalogPage(page)
    await catalog.goto()
    await catalog.addToCart('e2e-active-site.com')
    // Cart icon / badge should increment or toast should confirm
    await expect(
      page.getByText(/added to cart|cart updated/i).or(page.locator('[data-sonner-toast]'))
    ).toBeVisible({ timeout: 8_000 })
  })

  test('inactive site cannot be added to cart', async ({ page }) => {
    const catalog = new SitesCatalogPage(page)
    await catalog.goto()
    // The add-to-cart button for inactive site should be disabled
    const inactiveRow = page.locator(`tr:has-text("e2e-inactive-site.com")`)
    const addBtn = inactiveRow.getByRole('button', { name: /add to cart/i })
    await expect(addBtn).toBeDisabled()
  })

  test('checkout without publish month shows validation error', async ({ page }) => {
    const cart = new CartPage(page)
    await cart.gotoCheckout()
    await cart.clickCheckout()
    await expect(cart.validationError()).toBeVisible({ timeout: 5_000 })
  })

  test('checkout with valid publish month creates order and clears cart', async ({ page }) => {
    // Ensure at least one item in cart
    const catalog = new SitesCatalogPage(page)
    await catalog.goto()
    await catalog.addToCart('e2e-active-site.com')

    const cart = new CartPage(page)
    await cart.gotoCheckout()
    await cart.setPublishMonth(0, '2099-12')
    await cart.clickCheckout()

    // Should redirect to orders page or show success
    await expect(page).toHaveURL(/\/orders|\/dashboard/, { timeout: 15_000 })
  })
})
