'use client'

import { Suspense, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { KPICard } from '@webfudge/ui'
import { Receipt, Wallet, Landmark, XCircle } from 'lucide-react'
import VendorPageHeader from '../../components/VendorPageHeader'
import ListView from '../../components/ListView'
import { AppChip, ErrorState, PaymentBadge, RefreshButton } from '../../components/VendorUI'
import vendorApi from '../../lib/api'
import useVendorQuery from '../../lib/useVendorQuery'
import { downloadCsv } from '../../lib/csv'
import { cycleLabel, formatDateTime, formatINR, formatINRCompact, formatNumber, PAYMENT_KIND, planLabel } from '../../lib/format'

const time = (v) => (v ? new Date(v).getTime() : null)
const DAY = 864e5

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'paid', label: 'Paid', filter: (p) => p.status === 'paid' },
  { key: 'failed', label: 'Failed', filter: (p) => p.status === 'failed' },
  { key: 'created', label: 'Pending', filter: (p) => p.status === 'created' },
]

const COLUMNS = [
  {
    key: 'invoiceNumber',
    label: 'Invoice',
    sortValue: (p) => time(p.paidAt || p.createdAt),
    render: (v, p) => (
      <div className="whitespace-nowrap">
        <p className="text-sm font-semibold text-gray-900">{v || `Order #${p.id}`}</p>
        <p className="text-xs text-gray-500">{formatDateTime(p.paidAt || p.createdAt)}</p>
      </div>
    ),
  },
  {
    key: 'organization',
    label: 'Organization',
    sortValue: (p) => p.organization.name || '',
    render: (_, p) => <span className="font-medium text-gray-900">{p.organization.name || '—'}</span>,
  },
  { key: 'app', label: 'App', sortValue: (p) => p.app?.name || '', render: (v) => <AppChip app={v} /> },
  {
    key: 'planCode',
    label: 'Plan',
    render: (_, p) => (
      <div className="whitespace-nowrap">
        <p className="text-sm text-gray-800">
          {planLabel(p.planCode)} · {cycleLabel(p.billingCycle)}
        </p>
        <p className="text-xs text-gray-500">
          {PAYMENT_KIND[p.kind] || p.kind} · {p.users} seat{p.users === 1 ? '' : 's'}
        </p>
      </div>
    ),
  },
  { key: 'subtotal', label: 'Net', sortValue: (p) => p.subtotal, render: (v) => <span className="tabular-nums text-gray-700">{formatINR(v, { precise: true })}</span> },
  { key: 'tax', label: 'GST', render: (v) => <span className="tabular-nums text-gray-500">{formatINR(v, { precise: true })}</span> },
  {
    key: 'total',
    label: 'Total',
    sortValue: (p) => p.total,
    render: (v) => <span className="font-semibold tabular-nums text-gray-900">{formatINR(v, { precise: true })}</span>,
  },
  { key: 'status', label: 'Status', render: (v) => <PaymentBadge status={v} /> },
  {
    key: 'razorpayPaymentId',
    label: 'Razorpay ID',
    render: (v) => <span className="font-mono text-xs text-gray-500">{v || '—'}</span>,
  },
]

const CSV = [
  { label: 'Invoice', value: (p) => p.invoiceNumber || `Order #${p.id}` },
  { label: 'Date', value: (p) => formatDateTime(p.paidAt || p.createdAt) },
  { label: 'Organization', value: (p) => p.organization.name },
  { label: 'App', value: (p) => p.app?.name },
  { label: 'Plan', value: (p) => planLabel(p.planCode) },
  { label: 'Cycle', value: (p) => cycleLabel(p.billingCycle) },
  { label: 'Type', value: (p) => PAYMENT_KIND[p.kind] || p.kind },
  { label: 'Seats', value: (p) => p.users },
  { label: 'Net (INR)', value: (p) => p.subtotal },
  { label: 'GST (INR)', value: (p) => p.tax },
  { label: 'Total (INR)', value: (p) => p.total },
  { label: 'Status', value: (p) => p.status },
  { label: 'Razorpay payment ID', value: (p) => p.razorpayPaymentId },
]

function BillingList() {
  const router = useRouter()
  const { data, error, loading, refreshing, refresh } = useVendorQuery((opts) => vendorApi.payments(opts), [])
  const rows = data?.data || []
  const visible = useRef([])
  const onVisible = useCallback((list) => {
    visible.current = list
  }, [])

  const paid = rows.filter((p) => p.status === 'paid')
  const since = Date.now() - 30 * DAY
  const paid30 = paid.filter((p) => time(p.paidAt) >= since)
  const net30 = paid30.reduce((s, p) => s + p.subtotal, 0)
  const net = paid.reduce((s, p) => s + p.subtotal, 0)
  const gst = paid.reduce((s, p) => s + p.tax, 0)
  const failed30 = rows.filter((p) => p.status === 'failed' && time(p.createdAt) >= since).length

  return (
    <div className="space-y-6 p-4 md:p-6">
      <VendorPageHeader
        title="Billing"
        subtitle="Every payment and invoice raised through Razorpay"
        breadcrumb={[
          { label: 'Dashboard', href: '/' },
          { label: 'Billing', href: '/billing' },
        ]}
        showActions
        onExportClick={() => downloadCsv(`payments-${new Date().toISOString().slice(0, 10)}`, CSV, visible.current)}
        actions={<RefreshButton onClick={refresh} refreshing={refreshing} />}
      />

      {error ? <ErrorState error={error} onRetry={refresh} /> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Collected · 30 days" value={formatINRCompact(net30)} valueTitle={formatINR(net30)} subtitle={`${paid30.length} paid invoice${paid30.length === 1 ? '' : 's'} · excl. GST`} icon={Wallet} colorScheme="orange" />
        <KPICard title="Lifetime net revenue" value={formatINRCompact(net)} valueTitle={formatINR(net)} subtitle={`${formatNumber(paid.length)} paid invoices`} icon={Receipt} colorScheme="orange" />
        <KPICard title="GST collected" value={formatINRCompact(gst)} valueTitle={formatINR(gst)} subtitle="Lifetime, to remit" icon={Landmark} colorScheme="orange" />
        <KPICard title="Failed · 30 days" value={formatNumber(failed30)} subtitle="Card or UPI payments that did not go through" icon={XCircle} colorScheme="orange" />
      </div>

      <ListView
        rows={rows}
        loading={loading}
        tabs={TABS}
        columns={COLUMNS}
        search={(p) => [p.invoiceNumber, p.organization.name, p.app?.name, p.planCode, p.razorpayPaymentId].filter(Boolean).join(' ')}
        searchPlaceholder="Search invoice, organization or payment ID..."
        defaultSort={{ key: 'invoiceNumber', direction: 'desc' }}
        onRowClick={(p) => p.organization.id && router.push(`/organizations/${p.organization.id}`)}
        onVisibleRowsChange={onVisible}
        emptyIcon={Receipt}
        emptyTitle="No payments found"
        emptyDescription="Payments appear here when an organization checks out with Razorpay."
      />
    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingList />
    </Suspense>
  )
}
