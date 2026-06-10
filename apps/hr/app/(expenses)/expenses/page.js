'use client'

import { useMemo, useState } from 'react'
import {
  Receipt,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  Paperclip,
  Banknote,
  BarChart3,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  TableCellDateOnly,
  TableCellOrangePill,
  Card,
  TableResultsCount,
} from '@webfudge/ui'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRSectionCard from '../../../components/shared/HRSectionCard'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { EXPENSE_CLAIMS, EXPENSE_PAYOUTS } from '../../../lib/mock-data/expenses'
import {
  computeExpenseStats,
  filterExpenseClaims,
  filterExpensePayouts,
  getExpenseTabItems,
  getExpenseCategories,
  EXPENSE_CATEGORY_CHART,
} from '../../../lib/expensesPage'
import { useHRQuickActions } from '../../../components/quick-actions/HRQuickActionsContext'
import { HR_QUICK_ACTION_IDS } from '../../../lib/quickActions'

const STATUS_FILTERS = ['', 'Pending', 'Approved', 'Rejected', 'Paid']

export default function ExpensesPage() {
  const { openQuickAction } = useHRQuickActions()
  const [activeTab, setActiveTab] = useState('claims')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const stats = useMemo(() => computeExpenseStats(EXPENSE_CLAIMS), [])
  const tabItems = useMemo(() => getExpenseTabItems(), [])
  const categories = useMemo(() => getExpenseCategories(), [])

  const claimRows = useMemo(
    () =>
      filterExpenseClaims(EXPENSE_CLAIMS, {
        search: searchQuery,
        statusFilter,
        categoryFilter,
      }),
    [searchQuery, statusFilter, categoryFilter]
  )

  const approvalRows = useMemo(
    () => filterExpenseClaims(EXPENSE_CLAIMS.filter((c) => c.status === 'Pending'), { search: searchQuery }),
    [searchQuery]
  )

  const payoutRows = useMemo(
    () =>
      filterExpensePayouts(EXPENSE_PAYOUTS, searchQuery).map((row, index) => ({
        ...row,
        id: `payout-${index}`,
      })),
    [searchQuery]
  )

  const claimColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.employee} fallback={row.employee?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.employee}</div>
              <div className="truncate text-sm text-gray-500">{row.description}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'category',
        label: 'CATEGORY',
        render: (_, row) => <TableCellOrangePill value={row.category} />,
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'submitted',
        label: 'SUBMITTED',
        render: (_, row) => <TableCellDateOnly dateString={row.submitted} />,
      },
      {
        key: 'receipt',
        label: 'RECEIPT',
        render: (_, row) =>
          row.receipt ? (
            <span className="inline-flex items-center gap-1 text-sm text-gray-600">
              <Paperclip className="h-4 w-4 text-orange-500" aria-hidden />
              Attached
            </span>
          ) : (
            <TableCellText value="—" />
          ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const payoutColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px] font-medium text-gray-900">{row.employee}</div>
        ),
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'method',
        label: 'METHOD',
        render: (_, row) => <TableCellText value={row.method} />,
      },
      {
        key: 'scheduled',
        label: 'SCHEDULED',
        render: (_, row) => <TableCellDateOnly dateString={row.scheduled} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const approvalColumns = useMemo(
    () => [
      ...claimColumns.filter((c) => c.key !== 'status'),
      {
        key: 'status',
        label: 'STATUS',
        render: () => <HRStatusBadge status="Pending" />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[160px] items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button variant="primary" size="sm" onClick={() => console.log('Approve', row.id)}>
              Approve
            </Button>
            <Button variant="secondary" size="sm" onClick={() => console.log('Reject', row.id)}>
              Reject
            </Button>
          </div>
        ),
      },
    ],
    [claimColumns]
  )

  const resultCount =
    activeTab === 'claims'
      ? claimRows.length
      : activeTab === 'approvals'
        ? approvalRows.length
        : activeTab === 'payouts'
          ? payoutRows.length
          : 0

  return (
    <HRModulePage>
      <HRPageHeader
        title="Expenses"
        subtitle={`${stats.pending} pending claim${stats.pending === 1 ? '' : 's'} · ${stats.claimedLabel} claimed this month`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Expenses', href: '/expenses' },
        ]}
        showActions
        showSearch
        onImportClick={() => console.log('Import expenses')}
        onExportClick={() => console.log('Export expenses')}
      />

      <HRKpiRow>
        <KPICard
          title="Pending"
          value={stats.pending}
          subtitle={stats.pendingLabel + ' awaiting approval'}
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Approved"
          value={stats.approved}
          subtitle={stats.approvedLabel + ' approved'}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Rejected"
          value={stats.rejected}
          subtitle={stats.rejected === 0 ? 'No rejections' : stats.rejectedLabel + ' declined'}
          icon={XCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Total Claims"
          value={stats.total}
          subtitle={stats.claimedLabel + ' claimed'}
          icon={Receipt}
          colorScheme="orange"
        />
      </HRKpiRow>

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.count > 0 ? String(item.count) : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => openQuickAction(HR_QUICK_ACTION_IDS.NEW_EXPENSE)}
        addTitle="New Claim"
        showFilter
        onFilterClick={() => console.log('Filter expenses')}
        showExport
        onExportClick={() => console.log('Export expenses')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'claims' ? (
            <div className="hidden items-center gap-2 sm:flex">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Filter by status"
              >
                <option value="">All statuses</option>
                {STATUS_FILTERS.filter(Boolean).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                aria-label="Filter by category"
              >
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {activeTab !== 'reports' && <TableResultsCount count={resultCount} />}

      {activeTab === 'claims' && (
        <HRDataTableCard>
          <Table columns={claimColumns} data={claimRows} keyField="id" variant="modern" />
          {claimRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Receipt className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No expense claims found</h3>
              <p className="mb-4 text-sm text-gray-500">Try adjusting your search or filters.</p>
              <Button variant="primary" onClick={() => openQuickAction(HR_QUICK_ACTION_IDS.NEW_EXPENSE)}>
                <Plus className="mr-2 h-4 w-4" />
                New Claim
              </Button>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'approvals' && (
        <HRDataTableCard>
          <Table columns={approvalColumns} data={approvalRows} keyField="id" variant="modern" />
          {approvalRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <CheckCircle className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No pending approvals</h3>
              <p className="text-sm text-gray-500">All expense claims are up to date.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-6">
          <HRKpiRow>
            <KPICard title="Claimed (Month)" value={stats.claimedLabel} icon={Receipt} colorScheme="orange" />
            <KPICard title="Approved" value={stats.approvedLabel} icon={CheckCircle} colorScheme="orange" />
            <KPICard title="Pending" value={stats.pendingLabel} icon={Clock} colorScheme="orange" />
            <KPICard title="Rejected" value={stats.rejectedLabel} icon={XCircle} colorScheme="orange" />
          </HRKpiRow>
          <HRSectionCard className="h-72">
            <div className="mb-4 flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-orange-600" aria-hidden />
              <h3 className="font-semibold text-gray-900">Spend by category</h3>
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={EXPENSE_CATEGORY_CHART}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis dataKey="cat" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`₹${Number(v).toLocaleString('en-IN')}`, 'Amount']} />
                <Bar dataKey="amount" fill="#F97316" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </HRSectionCard>
        </div>
      )}

      {activeTab === 'payouts' && (
        <HRDataTableCard>
          <Table columns={payoutColumns} data={payoutRows} keyField="id" variant="modern" />
          {payoutRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Banknote className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No payouts scheduled</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </HRDataTableCard>
      )}
    </HRModulePage>
  )
}
