'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, RefreshCw, ListPlus, Repeat, PiggyBank, Wallet } from 'lucide-react'
import { Badge, KPICard, useTableSort } from '@webfudge/ui'
import { useInvest } from '../../components/InvestDataProvider'
import InvestPageHeader from '../../components/InvestPageHeader'
import SipModal from '../../components/SipModal'
import TransactionModal from '../../components/TransactionModal'
import { Page, Gain, ErrorBanner, ListView, FilterModal, RowActions, ConfirmDeleteModal, num, downloadCsv, KPI_GRID } from '../../components/ui'
import { investApi } from '../../lib/api'
import { nextDueDate, missingInstalments } from '../../lib/sip.mjs'
import { computeHolding } from '../../lib/portfolio.mjs'
import { formatINR, formatINRCompact, formatDate, formatUnits } from '../../lib/format'

function relId(rel) {
  return rel && typeof rel === 'object' ? rel.id : rel
}

const STATUS_VARIANT = { active: 'success', paused: 'warning', stopped: 'default' }
const TABS = [
  { key: 'active', label: 'Active' },
  { key: 'paused', label: 'Paused' },
  { key: 'stopped', label: 'Stopped' },
  { key: 'all', label: 'All' },
]
const SORT_COLUMNS = [
  { key: 'fund', label: 'Fund' },
  { key: 'amount', label: 'Instalment' },
  { key: 'count', label: 'Instalments' },
  { key: 'invested', label: 'Invested' },
  { key: 'currentValue', label: 'Current value' },
  { key: 'gain', label: 'Gain' },
  { key: 'next', label: 'Next due' },
]

const monthlyEquivalent = (s) => (s.frequency === 'weekly' ? (s.amount * 52) / 12 : s.frequency === 'quarterly' ? s.amount / 3 : s.amount)

export default function SipsPage() {
  const router = useRouter()
  const { loading, error, sips, transactions, instruments, reload } = useInvest()
  const [tab, setTab] = useState('active')
  const [q, setQ] = useState('')
  const [filters, setFilters] = useState({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [modal, setModal] = useState({ open: false, sip: null })
  const [txModal, setTxModal] = useState({ open: false, defaults: {} })
  const [toDelete, setToDelete] = useState(null)
  const [busy, setBusy] = useState(null)
  const [notice, setNotice] = useState(null)
  const [actionError, setActionError] = useState(null)
  const sort = useTableSort({ storageKey: 'invest-sips-sort', defaultRules: [{ key: 'next', direction: 'asc' }] })

  const enriched = useMemo(() => {
    const instById = new Map(instruments.map((i) => [i.id, i]))
    return sips.map((s) => {
      const instalments = transactions.filter((t) => relId(t.sip) === s.id)
      const inst = instById.get(relId(s.instrument)) || s.instrument
      const h = computeHolding(inst, instalments) // value of the units bought through this SIP
      return {
        ...s,
        fund: inst?.name || '',
        instalments,
        count: instalments.length,
        invested: h.invested,
        units: h.units,
        currentValue: h.currentValue,
        gain: h.hasPrice ? h.unrealised : null,
        gainPct: h.unrealisedPct,
        next: nextDueDate(s),
        missing: missingInstalments(s, instalments.map((t) => t.date)),
      }
    })
  }, [sips, transactions, instruments])

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase()
    return enriched.filter(
      (s) =>
        (!filters.frequency || s.frequency === filters.frequency) &&
        (!filters.missing || (filters.missing === 'yes' ? s.missing.length > 0 : s.missing.length === 0)) &&
        (!term || `${s.fund} ${s.folio || ''} ${s.account || ''}`.toLowerCase().includes(term))
    )
  }, [enriched, filters, q])

  const rows = useMemo(
    () => sort.sortData(filtered.filter((s) => tab === 'all' || s.status === tab), (s, key) => (key === 'fund' ? s.fund.toLowerCase() : key === 'next' ? s.next || '9999' : s[key])),
    [filtered, tab, sort]
  )
  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.key, t.key === 'all' ? filtered.length : filtered.filter((s) => s.status === t.key).length])), [filtered])

  const active = enriched.filter((s) => s.status === 'active')
  const monthly = active.reduce((sum, s) => sum + monthlyEquivalent(s), 0)
  const investedAll = enriched.reduce((s, r) => s + r.invested, 0)
  const valueAll = enriched.reduce((s, r) => s + r.currentValue, 0)
  const missingAll = enriched.reduce((s, r) => s + r.missing.length, 0)

  async function sync(sip) {
    setBusy(sip.id)
    setNotice(null)
    setActionError(null)
    try {
      const res = await investApi.syncSip(sip.id)
      const created = res?.meta?.created || 0
      const skipped = res?.meta?.skipped || []
      setNotice(
        `${sip.fund}: recorded ${created} instalment${created === 1 ? '' : 's'} at the published NAV.` +
          (skipped.length ? ` ${skipped.length} skipped (${skipped[0].reason}).` : '') +
          (res?.meta?.remaining ? ` ${res.meta.remaining} more to go — run it again.` : '')
      )
      await reload()
    } catch (err) {
      setActionError(err.message)
    } finally {
      setBusy(null)
    }
  }

  const columns = [
    {
      key: 'fund',
      label: 'Fund',
      render: (_, s) => (
        <div className="min-w-0 max-w-[18rem]">
          <p className="truncate font-medium text-gray-900">{s.fund}</p>
          <span className="text-xs text-gray-500">
            {s.frequency}
            {s.frequency !== 'weekly' ? ` · day ${s.dayOfMonth}` : ''} · since {formatDate(s.startDate)}
            {s.endDate ? ` · until ${formatDate(s.endDate)}` : ''}
          </span>
        </div>
      ),
    },
    { key: 'status', label: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v]} size="sm"><span className="capitalize">{v}</span></Badge> },
    num({ key: 'amount', label: 'Instalment', render: (v) => formatINR(v) }),
    num({ key: 'count', label: 'Instalments' }),
    num({ key: 'invested', label: 'Invested', render: (v) => formatINR(v) }),
    num({ key: 'units', label: 'Units', render: (v) => formatUnits(v) }),
    num({ key: 'currentValue', label: 'Current value', render: (v) => formatINR(v) }),
    num({ key: 'gain', label: 'Gain', render: (_, s) => <Gain value={s.gain} pct={s.gainPct} compact /> }),
    num({
      key: 'next',
      label: 'Next due',
      render: (_, s) => (
        <div>
          <span>{s.next ? formatDate(s.next) : '—'}</span>
          {s.missing.length ? <p className="text-xs text-amber-700">{s.missing.length} not recorded</p> : null}
        </div>
      ),
    }),
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-right',
      className: 'text-right',
      render: (_, s) => (
        <RowActions
          extra={
            <>
              {s.missing.length ? (
                <button
                  type="button"
                  onClick={() => sync(s)}
                  disabled={busy === s.id}
                  className="inline-flex rounded-md p-2 text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
                  title="Record due instalments at each date's published NAV"
                  aria-label="Record due instalments"
                >
                  <RefreshCw className={`h-4 w-4 ${busy === s.id ? 'animate-spin' : ''}`} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => setTxModal({ open: true, defaults: { instrumentId: relId(s.instrument), type: 'sip', sipId: s.id } })}
                className="inline-flex rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100"
                title="Record one instalment by hand"
                aria-label="Record one instalment by hand"
              >
                <ListPlus className="h-4 w-4" />
              </button>
            </>
          }
          onView={() => router.push(`/holdings/${relId(s.instrument)}`)}
          onEdit={() => setModal({ open: true, sip: s })}
          onDelete={() => setToDelete(s)}
        />
      ),
    },
  ]

  function exportCsv() {
    downloadCsv(
      `webfudge-sips-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Fund', 'Status', 'Amount', 'Frequency', 'Day', 'Start', 'End', 'Instalments', 'Invested', 'Units', 'Current value', 'Next due', 'Folio'],
      rows.map((s) => [s.fund, s.status, s.amount, s.frequency, s.dayOfMonth, s.startDate, s.endDate, s.count, s.invested.toFixed(2), s.units, s.currentValue.toFixed(2), s.next, s.folio])
    )
  }

  return (
    <Page>
      <InvestPageHeader
        title="SIPs"
        subtitle="Systematic investment plans and their instalments"
        breadcrumb={[
          { label: 'Portfolio', href: '/' },
          { label: 'SIPs', href: '/sips' },
        ]}
        showActions
        onExportClick={exportCsv}
      />

      <div className={KPI_GRID}>
        <KPICard title="Monthly Commitment" value={formatINRCompact(monthly)} valueTitle={formatINR(monthly)} subtitle={`${active.length} active · ${missingAll ? `${missingAll} instalments not recorded` : 'all recorded'}`} icon={Repeat} colorScheme="orange" />
        <KPICard title="Invested via SIPs" value={formatINRCompact(investedAll)} valueTitle={formatINR(investedAll)} subtitle="Cost of SIP units held" icon={PiggyBank} colorScheme="orange" />
        <KPICard title="Current Value" value={formatINRCompact(valueAll)} valueTitle={formatINR(valueAll)} subtitle={`${formatINR(valueAll - investedAll, { signed: true })} gain`} icon={Wallet} colorScheme="orange" />
      </div>

      <ErrorBanner message={error || actionError} />
      {notice ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">{notice}</p> : null}

      <ListView
        tabs={TABS.map((t) => ({ key: t.key, label: t.label, badge: String(counts[t.key] || 0) }))}
        activeTab={tab}
        onTabChange={setTab}
        searchQuery={q}
        onSearchChange={setQ}
        searchPlaceholder="Search fund, folio..."
        onAddClick={() => setModal({ open: true, sip: null })}
        addTitle="New SIP"
        onFilterClick={() => setFilterOpen(true)}
        sort={sort}
        sortColumnOptions={SORT_COLUMNS}
        columns={columns}
        rows={rows}
        loading={loading}
        onRowClick={(s) => setModal({ open: true, sip: s })}
        empty={{
          icon: CalendarClock,
          title: sips.length ? 'No SIPs found' : 'No SIPs yet',
          description: sips.length ? 'Try adjusting your filters' : 'Create a SIP for a mutual fund; past instalments can be recorded automatically from AMFI NAVs',
        }}
      />

      <FilterModal
        isOpen={filterOpen}
        onClose={() => setFilterOpen(false)}
        title="Filter SIPs"
        description="Refine your SIP list"
        value={filters}
        onApply={setFilters}
        fields={[
          { key: 'frequency', label: 'Frequency', options: [{ value: 'monthly', label: 'Monthly' }, { value: 'quarterly', label: 'Quarterly' }, { value: 'weekly', label: 'Weekly' }] },
          { key: 'missing', label: 'Instalments', options: [{ value: 'yes', label: 'Has unrecorded instalments' }, { value: 'no', label: 'Fully recorded' }] },
        ]}
      />

      <SipModal isOpen={modal.open} sip={modal.sip} onClose={() => setModal({ open: false, sip: null })} />
      <TransactionModal isOpen={txModal.open} defaults={txModal.defaults} onClose={() => setTxModal({ open: false, defaults: {} })} />
      <ConfirmDeleteModal
        isOpen={Boolean(toDelete)}
        title="Delete SIP"
        confirmLabel="Delete SIP"
        message={toDelete ? `Delete the ${formatINR(toDelete.amount)} SIP in ${toDelete.fund}? Its recorded instalments stay as transactions.` : ''}
        onConfirm={async () => {
          await investApi.deleteSip(toDelete.id)
          await reload()
        }}
        onClose={() => setToDelete(null)}
      />
    </Page>
  )
}
