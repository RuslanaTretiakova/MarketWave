'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

const LEAVE_EDIT_MESSAGE =
  'Are you sure you want to leave without saving? Your changes will be lost.'

export function SiteDetailBreadcrumbs({ domain, siteId }: { domain: string; siteId: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const base = pathname.split('?')[0] ?? pathname
  const isEdit = base === `/sites/${siteId}/edit`

  return (
    <Breadcrumb className="mb-layout">
      <BreadcrumbList className="text-xs">
        <BreadcrumbItem>
          <BreadcrumbLink
            render={
              <Link
                href="/sites"
                onClick={(e) => {
                  if (!isEdit) return
                  e.preventDefault()
                  if (window.confirm(LEAVE_EDIT_MESSAGE)) {
                    router.push('/sites')
                  }
                }}
              />
            }
          >
            Site catalog
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          {isEdit ? (
            <BreadcrumbLink render={<Link href={`/sites/${siteId}`} />}>{domain}</BreadcrumbLink>
          ) : (
            <BreadcrumbPage>{domain}</BreadcrumbPage>
          )}
        </BreadcrumbItem>
        {isEdit ? (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        ) : null}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
