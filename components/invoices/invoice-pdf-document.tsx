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
    paddingVertical: 12,
  },
  cellDescription: {
    flex: 4,
    paddingHorizontal: 12,
  },
  cellAmount: {
    flex: 1,
    paddingHorizontal: 12,
    textAlign: 'right',
  },
  totals: {
    marginTop: 16,
    alignSelf: 'flex-end',
    width: 220,
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
  grandTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginTop: 6,
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

export function InvoicePdfDocument({ invoice }: { invoice: InvoiceDetail }) {
  const fmtMoney = (n: number) =>
    `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
  const invoiceNumber = invoice.invoice_number ?? invoice.id.slice(0, 8).toUpperCase()

  return (
    <Document title={`Invoice ${invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
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

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill to</Text>
            <Text style={styles.customerName}>{invoice.client_name ?? 'Client'}</Text>
            {invoice.client_email && <Text style={{ marginTop: 4 }}>{invoice.client_email}</Text>}
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Order</Text>
            <Text style={{ fontWeight: 700 }}>{invoice.site_domain}</Text>
            {invoice.order_publish_date && (
              <Text style={{ marginTop: 4 }}>Publish date: {invoice.order_publish_date}</Text>
            )}
            {invoice.order_published_url && (
              <Text style={{ marginTop: 4, color: '#1d4ed8' }}>{invoice.order_published_url}</Text>
            )}
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.cellDescription}>Description</Text>
            <Text style={styles.cellAmount}>Amount</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.cellDescription}>
              <Text style={{ fontWeight: 700 }}>Sponsored placement</Text>
              <Text style={{ color: '#475569', marginTop: 4 }}>{invoice.site_domain}</Text>
            </View>
            <Text style={styles.cellAmount}>{fmtMoney(invoice.amount)}</Text>
          </View>
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmtMoney(invoice.amount)}</Text>
          </View>
          <View style={styles.grandTotal}>
            <Text>Total due</Text>
            <Text>{fmtMoney(invoice.amount)}</Text>
          </View>
        </View>

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
