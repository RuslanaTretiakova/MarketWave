import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Site catalog',
}

export default function SitesPage() {
  return (
    <div className="space-y-layout mx-auto max-w-6xl">
      <div>
        <h2 className="text-foreground text-2xl font-semibold tracking-tight">Site catalog</h2>
        <p className="text-muted-foreground mt-inset max-w-2xl text-sm leading-relaxed">
          Searchable inventory of placements — connect to your `sites` table when ready.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            This screen will list catalog rows with filters (country, language, DR, niche) aligned
            to your Supabase RLS policies.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
