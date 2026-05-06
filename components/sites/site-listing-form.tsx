'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  FormControlInput,
  FormControlSelect,
  FormControlTextarea,
} from '@/components/ui/form-control'
import { Label } from '@/components/ui/label'
import type { SitesCatalogCategoryOption } from '@/components/sites/sites-catalog'
import { createSite, updateSite, type SiteListingPayload } from '@/lib/sites/site-actions'
import type { Database } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const LINK_TYPES: Database['public']['Enums']['link_type'][] = [
  'dofollow',
  'nofollow',
  'sponsored',
  'ugc',
]

export type SiteFormSourcerOption = { id: string; label: string }

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-border/60 bg-card gap-block rounded-2xl border p-5">
      <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        {title}
      </h3>
      {children}
    </section>
  )
}

export function SiteListingForm({
  mode,
  siteId,
  categories,
  sourcersForAdmin,
  initial,
  role,
}: {
  mode: 'create' | 'edit'
  siteId?: string
  categories: SitesCatalogCategoryOption[]
  sourcersForAdmin?: SiteFormSourcerOption[]
  initial?: Partial<SiteListingPayload> & { category_id?: number }
  role: Database['public']['Enums']['user_role']
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const defaults = useMemo(
    () => ({
      domain: initial?.domain ?? '',
      dr: initial?.dr ?? 0,
      category_id: initial?.category_id ?? categories[0]?.id ?? 0,
      price: initial?.price ?? 0,
      link_type: initial?.link_type ?? ('dofollow' as Database['public']['Enums']['link_type']),
      requirements: initial?.requirements ?? '',
      description: initial?.description ?? '',
      sourcer_notes: initial?.sourcer_notes ?? '',
      contact_info: initial?.contact_info ?? '',
      keywords_relevance: initial?.keywords_relevance ?? '',
      organic_keywords_count: initial?.organic_keywords_count ?? 0,
      organic_traffic_count: initial?.organic_traffic_count ?? 0,
      countriesCsv: initial?.countriesCsv ?? '',
      languagesCsv: initial?.languagesCsv ?? '',
      sourcer_id: initial?.sourcer_id ?? '',
    }),
    [initial, categories]
  )

  const [form, setForm] = useState(defaults)
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: String(c.id), label: c.name })),
    [categories]
  )
  const sourcerOptions = useMemo(
    () => [
      { value: '', label: 'Unassigned' },
      ...(sourcersForAdmin ?? []).map((s) => ({ value: s.id, label: s.label })),
    ],
    [sourcersForAdmin]
  )
  const linkTypeOptions = useMemo(() => LINK_TYPES.map((lt) => ({ value: lt, label: lt })), [])

  const submit = useCallback(() => {
    const payload: SiteListingPayload = {
      domain: form.domain,
      dr: Number(form.dr),
      category_id: Number(form.category_id),
      price: Number(form.price),
      link_type: form.link_type,
      requirements: form.requirements || null,
      description: form.description || null,
      sourcer_notes: form.sourcer_notes || null,
      contact_info: form.contact_info || null,
      keywords_relevance: form.keywords_relevance || null,
      organic_keywords_count: Number(form.organic_keywords_count),
      organic_traffic_count: Number(form.organic_traffic_count),
      countriesCsv: form.countriesCsv,
      languagesCsv: form.languagesCsv,
      sourcer_id:
        role === 'admin' && form.sourcer_id.trim()
          ? form.sourcer_id.trim()
          : role === 'admin'
            ? null
            : undefined,
    }

    startTransition(async () => {
      if (mode === 'create') {
        const res = await createSite(payload)
        if (!res.ok) {
          toast.error(res.message)
          return
        }
        toast.success('Site created.')
        router.push(`/sites/${res.siteId}`)
        router.refresh()
        return
      }

      if (!siteId) {
        toast.error('Missing site id.')
        return
      }

      const res = await updateSite(siteId, payload)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      toast.success('Site updated.')
      router.push(`/sites/${siteId}`)
      router.refresh()
    })
  }, [form, mode, siteId, router, role])

  return (
    <div className="gap-layout mx-auto flex w-full max-w-4xl flex-col">
      <SectionCard title="Basics">
        <div className="gap-block grid grid-cols-1 sm:grid-cols-2">
          <div className="gap-inset flex flex-col">
            <Label htmlFor="domain">Domain *</Label>
            <FormControlInput
              id="domain"
              value={form.domain}
              onChange={(e) => setForm((f) => ({ ...f, domain: e.target.value }))}
              placeholder="example.com"
              required
              autoComplete="off"
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="category">Category *</Label>
            <FormControlSelect
              id="category"
              value={String(form.category_id)}
              onValueChange={(value) => setForm((f) => ({ ...f, category_id: Number(value) }))}
              options={categoryOptions}
              name="category"
              placeholder="Select category"
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="link_type">Link type *</Label>
            <FormControlSelect
              id="link_type"
              value={form.link_type}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  link_type: value as Database['public']['Enums']['link_type'],
                }))
              }
              options={linkTypeOptions}
              name="link_type"
              placeholder="Select link type"
            />
          </div>
          {role === 'admin' && sourcersForAdmin !== undefined ? (
            <div className="gap-inset flex flex-col">
              <Label htmlFor="sourcer">Assigned sourcer</Label>
              <FormControlSelect
                id="sourcer"
                value={form.sourcer_id}
                onValueChange={(value) => setForm((f) => ({ ...f, sourcer_id: value }))}
                options={sourcerOptions}
                name="sourcer"
              />
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Metrics">
        <div className="gap-block grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <div className="gap-inset flex flex-col">
            <Label htmlFor="dr">DR *</Label>
            <FormControlInput
              id="dr"
              inputMode="numeric"
              value={form.dr === 0 ? '' : String(form.dr)}
              onChange={(e) =>
                setForm((f) => ({ ...f, dr: e.target.value === '' ? 0 : Number(e.target.value) }))
              }
              required
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="price">Price (USD) *</Label>
            <FormControlInput
              id="price"
              inputMode="decimal"
              value={form.price === 0 ? '' : String(form.price)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  price: e.target.value === '' ? 0 : Number(e.target.value),
                }))
              }
              required
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="organic_kw">Organic keywords *</Label>
            <FormControlInput
              id="organic_kw"
              inputMode="numeric"
              value={form.organic_keywords_count === 0 ? '' : String(form.organic_keywords_count)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  organic_keywords_count: e.target.value === '' ? 0 : Number(e.target.value),
                }))
              }
              required
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="organic_traffic">Organic traffic *</Label>
            <FormControlInput
              id="organic_traffic"
              inputMode="numeric"
              value={form.organic_traffic_count === 0 ? '' : String(form.organic_traffic_count)}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  organic_traffic_count: e.target.value === '' ? 0 : Number(e.target.value),
                }))
              }
              required
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Geography & Language">
        <div className="gap-block grid grid-cols-1 lg:grid-cols-2">
          <div className="gap-inset flex flex-col">
            <Label htmlFor="countries">Countries *</Label>
            <FormControlInput
              id="countries"
              value={form.countriesCsv}
              onChange={(e) => setForm((f) => ({ ...f, countriesCsv: e.target.value }))}
              placeholder="US, GB, CA"
              required
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="languages">Languages *</Label>
            <FormControlInput
              id="languages"
              value={form.languagesCsv}
              onChange={(e) => setForm((f) => ({ ...f, languagesCsv: e.target.value }))}
              placeholder="en, es"
              required
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Details (Optional)">
        <div className="gap-block grid grid-cols-1 sm:grid-cols-2">
          <div className="gap-inset flex flex-col">
            <Label htmlFor="requirements">Requirements</Label>
            <FormControlTextarea
              id="requirements"
              value={form.requirements}
              onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
              placeholder="Editorial guidelines, anchor rules..."
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="description">Description</Label>
            <FormControlTextarea
              id="description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="What this placement covers."
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="sourcer_notes">Sourcer notes</Label>
            <FormControlTextarea
              id="sourcer_notes"
              value={form.sourcer_notes}
              onChange={(e) => setForm((f) => ({ ...f, sourcer_notes: e.target.value }))}
              placeholder="Internal sourcing context."
            />
          </div>
          <div className="gap-inset flex flex-col">
            <Label htmlFor="contact_info">Contact info</Label>
            <FormControlInput
              id="contact_info"
              value={form.contact_info}
              onChange={(e) => setForm((f) => ({ ...f, contact_info: e.target.value }))}
              placeholder="editor@domain.com"
            />
          </div>
          <div className="gap-inset flex flex-col sm:col-span-2">
            <Label htmlFor="keywords_rel">Keywords relevance</Label>
            <FormControlTextarea
              id="keywords_rel"
              value={form.keywords_relevance}
              onChange={(e) => setForm((f) => ({ ...f, keywords_relevance: e.target.value }))}
              placeholder="Comma-separated relevance keywords."
            />
          </div>
        </div>
      </SectionCard>

      <div className="gap-block flex flex-wrap justify-end">
        <Link
          href={mode === 'edit' && siteId ? `/sites/${siteId}` : '/sites'}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'default' }),
            'h-10 min-h-10 justify-center rounded-full'
          )}
        >
          Cancel
        </Link>
        <Button
          type="button"
          variant="cta"
          className="h-10 min-h-10 justify-center rounded-full"
          disabled={pending}
          onClick={submit}
        >
          {mode === 'create' ? 'Create site' : 'Save changes'}
        </Button>
      </div>
    </div>
  )
}
