import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

import { SiteListingForm } from '@/components/sites/site-listing-form'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Create site',
}

export default async function NewSitePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'sourcer') {
    notFound()
  }

  const { data: categoriesRaw, error: catErr } = await supabase
    .from('categories')
    .select('id, name')
    .order('name', { ascending: true })

  if (catErr || !categoriesRaw?.length) {
    throw new Error(catErr?.message ?? 'No categories available. Create a category first.')
  }

  return (
    <div className="gap-layout mx-auto flex max-w-6xl flex-col">
      <div className="gap-block flex flex-col items-start">
        <nav aria-label="Breadcrumb" className="text-muted-foreground text-xs">
          <ol className="gap-inset flex items-center">
            <li>
              <Link
                href="/sites"
                className="hover:text-foreground transition-colors hover:underline"
              >
                Sites
              </Link>
            </li>
            <li aria-hidden>
              <ChevronRight className="size-3.5 opacity-70" />
            </li>
            <li className="text-foreground font-medium">Create site</li>
          </ol>
        </nav>
        <div className="space-y-inset min-w-0">
          <h2 className="font-display text-foreground text-xl font-semibold tracking-tight">
            Create site
          </h2>
          <p className="text-muted-foreground max-w-xl text-xs leading-relaxed">
            New listings start as Pending review. Attach countries and languages as ISO / BCP-47
            codes (comma-separated).
          </p>
        </div>
      </div>

      <SiteListingForm mode="create" role={profile.role} categories={categoriesRaw} />
    </div>
  )
}
