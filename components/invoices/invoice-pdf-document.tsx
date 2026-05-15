import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { INVOICE_STATUS_LABEL } from '@/lib/invoices/invoice-status-labels'
import type { InvoiceDetail } from '@/lib/invoices/load-invoices'

const styles = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 11,
    color: '#0f172a',
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 32,
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    color: '#0f172a',
  },
  meta: {
    fontSize: 10,
    color: '#475569',
    textAlign: 'right',
  },
  metaLabel: {
    fontWeight: 700,
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 1,
  },
  sectionTitle: {
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 6,
  },
  twoCol: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  col: {
    flex: 1,
    paddingRight: 16,
  },
  customerName: {
    fontSize: 12,
    fontWeight: 700,
  },
  table: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
    fontWeight: 700,
    fontSize: 9,
    textTransform: 'uppercase',
    color: '#475569',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#f1f5f9',
  },
  tableRowLast: {
    borderBottomWidth: 0,
  },
  cellNo: {
    width: 24,
    paddingHorizontal: 8,
    color: '#94a3b8',
    fontSize: 9,
  },
  cellDescription: {
    flex: 4,
    paddingHorizontal: 8,
  },
  cellDate: {
    flex: 2,
    paddingHorizontal: 8,
    color: '#475569',
    fontSize: 10,
  },
  cellAmount: {
    flex: 1,
    paddingHorizontal: 8,
    textAlign: 'right',
  },
  totals: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: 240,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  totalLabel: {
    color: '#475569',
  },
  totalValue: {
    fontWeight: 700,
  },
  divider: {
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 4,
  },
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: '#0f172a',
    fontSize: 14,
    fontWeight: 700,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 16,
    borderTopWidth: 1,
    borderColor: '#e2e8f0',
    color: '#64748b',
    fontSize: 9,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    color: '#0f172a',
    fontSize: 9,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 4,
  },
})

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export function InvoicePdfDocument({ invoice }: { invoice: InvoiceDetail }) {
  const issued = new Date(invoice.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const due = invoice.due_date
    ? new Date(invoice.due_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

  const billingMonth = invoice.billing_month
    ? new Date(invoice.billing_month).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        timeZone: 'UTC',
      })
    : invoice.billing_period_label

  const invoiceNumber = invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()

  return (
    <Document title={`Invoice ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>MarketWeave</Text>
            <Text style={styles.statusPill}>{INVOICE_STATUS_LABEL[invoice.status]}</Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.metaLabel}>Invoice</Text>
            <Text style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>
              #{invoiceNumber}
            </Text>
            <Text style={{ marginTop: 6 }}>Issued {issued}</Text>
            <Text>Due {due}</Text>
          </View>
        </View>

        {/* Bill to / Billing period */}
        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill to</Text>
            <Text style={styles.customerName}>{invoice.client_name ?? 'Client'}</Text>
            {invoice.client_email ? (
              <Text style={{ marginTop: 4 }}>{invoice.client_email}</Text>
            ) : null}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Billing period</Text>
            <Text style={{ fontWeight: 700 }}>{billingMonth}</Text>
          </View>
        </View>

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellNo}>#</Text>
            <Text style={styles.cellDescription}>Description / Site</Text>
            <Text style={styles.cellDate}>Publish date</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          {invoice.items.map((item, idx) => (
            <View
              key={item.id}
              style={[styles.tableRow, idx === invoice.items.length - 1 ? styles.tableRowLast : {}]}
            >
              <Text style={styles.cellNo}>{idx + 1}</Text>
              <View style={styles.cellDescription}>
                <Text style={{ fontWeight: 700 }}>{item.description ?? 'Sponsored placement'}</Text>
                {item.site_domain ? (
                  <Text style={{ color: '#475569', marginTop: 2 }}>{item.site_domain}</Text>
                ) : null}
              </View>
              <Text style={styles.cellDate}>{item.order_publish_date ?? '—'}</Text>
              <Text style={styles.cellAmount}>{fmtMoney(item.amount)}</Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtMoney(invoice.subtotal)}</Text>
          </View>
          {invoice.adjustments !== 0 ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Adjustments</Text>
              <Text style={styles.totalValue}>{fmtMoney(invoice.adjustments)}</Text>
            </View>
          ) : null}
          <View style={styles.grandTotal}>
            <Text>Total due</Text>
            <Text>{fmtMoney(invoice.total)}</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text>
            Questions? Reply to this email or contact us through the chat in your dashboard.
          </Text>
          <Text style={{ marginTop: 4 }}>Thank you for your business.</Text>
        </View>
      </Page>
    </Document>
  )
}
