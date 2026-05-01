import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Orders',
}

export default function OrdersPage() {
  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Orders</h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          Pipeline from selection through publish — mirrors your enforced status transitions in the
          database.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>No orders yet</CardTitle>
          <CardDescription>
            Order rows will appear here from `orders` with role-aware visibility via RLS.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
