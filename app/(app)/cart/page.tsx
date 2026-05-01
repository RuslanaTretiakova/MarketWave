import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Cart',
}

export default function CartPage() {
  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Cart</h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          One cart per user — items roll into checkout and order creation through server actions.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your cart is empty</CardTitle>
          <CardDescription>
            Add sites from the catalog; cart persistence uses `carts` and `cart_items`.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
