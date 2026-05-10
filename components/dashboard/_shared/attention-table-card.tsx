import Link from 'next/link'
import type { ReactNode } from 'react'

import { buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type AttentionColumn = {
  key: string
  label: string
  /** Right-align numeric / action columns. */
  align?: 'left' | 'right'
}

export function AttentionTableCard<T>({
  title,
  description,
  link,
  columns,
  rows,
  renderRow,
  emptyState,
  /** When provided, the card spans 2 columns inside an outer 3-column grid. */
  span2 = true,
}: {
  title: string
  description?: string
  link?: { href: string; label: string }
  columns: AttentionColumn[]
  rows: T[]
  renderRow: (row: T) => ReactNode
  emptyState: ReactNode
  span2?: boolean
}) {
  return (
    <Card className={cn('border-border rounded-2xl shadow-none', span2 && 'lg:col-span-2')}>
      <CardHeader className="gap-inset border-border [.border-b]:pb-section border-b">
        <div className="gap-block flex flex-wrap items-start justify-between">
          <div>
            <CardTitle className="font-heading text-xl tracking-tight md:text-2xl">
              {title}
            </CardTitle>
            {description ? (
              <CardDescription className="font-sans text-sm">{description}</CardDescription>
            ) : null}
          </div>
          {link ? (
            <Link
              href={link.href}
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'border-border rounded-full'
              )}
            >
              {link.label}
            </Link>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    'text-muted-foreground font-sans text-[0.65rem] font-semibold tracking-wider uppercase',
                    col.align === 'right' && 'text-right'
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-muted-foreground py-section text-center text-sm"
                >
                  {emptyState}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => renderRow(row))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
