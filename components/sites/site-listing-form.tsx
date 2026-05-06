'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useMemo, useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  FormControlInput,
  FormControlTextarea,
  formControlSelectClassName,
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
    <div className="border-border/60 bg-card shadow-soft p-section mx-auto max-w-3xl overflow-hidden rounded-2xl border">
      <div className="gap-block mb-layout grid grid-cols-1 sm:grid-cols-2">
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="domain">Domain</Label>
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
          <Label htmlFor="dr">DR</Label>
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
          <Label htmlFor="price">Price (USD)</Label>
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
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={formControlSelectClassName}
            value={String(form.category_id)}
            onChange={(e) => setForm((f) => ({ ...f, category_id: Number(e.target.value) }))}
            required
          >
            {categories.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {role === 'admin' && sourcersForAdmin !== undefined ? (
          <div className="gap-inset flex flex-col sm:col-span-2">
            <Label htmlFor="sourcer">Assigned sourcer</Label>
            <select
              id="sourcer"
              className={formControlSelectClassName}
              value={form.sourcer_id}
              onChange={(e) => setForm((f) => ({ ...f, sourcer_id: e.target.value }))}
            >
              <option value="">Unassigned</option>
              {sourcersForAdmin.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="countries">Countries (ISO codes, comma-separated)</Label>
          <FormControlInput
            id="countries"
            value={form.countriesCsv}
            onChange={(e) => setForm((f) => ({ ...f, countriesCsv: e.target.value }))}
            placeholder="US, GB, CA"
            required
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="languages">Languages (BCP-47, comma-separated)</Label>
          <FormControlInput
            id="languages"
            value={form.languagesCsv}
            onChange={(e) => setForm((f) => ({ ...f, languagesCsv: e.target.value }))}
            placeholder="en, es"
            required
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="link_type">Link type</Label>
          <select
            id="link_type"
            className={formControlSelectClassName}
            value={form.link_type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                link_type: e.target.value as Database['public']['Enums']['link_type'],
              }))
            }
          >
            {LINK_TYPES.map((lt) => (
              <option key={lt} value={lt}>
                {lt}
              </option>
            ))}
          </select>
        </div>
        <div className="gap-inset flex flex-col">
          <Label htmlFor="organic_kw">Organic keywords count</Label>
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
          <Label htmlFor="organic_traffic">Organic traffic count</Label>
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
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="keywords_rel">Keywords relevance</Label>
          <FormControlInput
            id="keywords_rel"
            value={form.keywords_relevance}
            onChange={(e) => setForm((f) => ({ ...f, keywords_relevance: e.target.value }))}
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="requirements">Requirements</Label>
          <FormControlTextarea
            id="requirements"
            value={form.requirements}
            onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))}
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <FormControlTextarea
            id="description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="sourcer_notes">Sourcer notes</Label>
          <FormControlTextarea
            id="sourcer_notes"
            value={form.sourcer_notes}
            onChange={(e) => setForm((f) => ({ ...f, sourcer_notes: e.target.value }))}
          />
        </div>
        <div className="gap-inset flex flex-col sm:col-span-2">
          <Label htmlFor="contact_info">Contact info</Label>
          <FormControlTextarea
            id="contact_info"
            value={form.contact_info}
            onChange={(e) => setForm((f) => ({ ...f, contact_info: e.target.value }))}
          />
        </div>
      </div>

      <div className="gap-block border-border/60 pt-block flex flex-wrap justify-end border-t">
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
          Save
        </Button>
      </div>
    </div>
  )
}
