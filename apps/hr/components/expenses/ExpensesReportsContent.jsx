'use client'

import { useMemo, useState } from 'react'
import { BarChart3, CheckCircle, Clock, Receipt, Users, XCircle } from 'lucide-react'
import {
  Input,
  KPICard,
  Table,
  TableCellText,
  TableEmptyBelow,
  TableResultsCount,
  TabsWithActions,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import HRKpiRow from '../layout/HRKpiRow'
import ExpensesSpendBarChart from './ExpensesSpendBarChart'
import ExpensesSpendStatusDonut from './ExpensesSpendStatusDonut'
import useExpenseData from '../../hooks/useExpenseData'
import { buildCategoryChart, formatExpenseAmount } from '../../lib/expensesShared'
import {
  buildEmployeeSpendRows,
  buildStatusChart,
  computeExpenseStats,
  downloadExpenseReportCsv,
  filterClaimsByMonth,
  getExpenseReportsTabItems,
} from '../../lib/expensesPage'

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ExpensesReportsContent() {
  const { claims, error } = useExpenseData()
  const [activeTab, setActiveTab] = useState('overview')
  const [monthValue, setMonthValue] = useState(currentMonthValue)

  const monthClaims = useMemo(() => filterClaimsByMonth(claims, monthValue), [claims, monthValue])
  const stats = useMemo(() => computeExpenseStats(monthClaims), [monthClaims])
  const tabItems = useMemo(() => getExpenseReportsTabItems(monthClaims), [monthClaims])

  const categoryChart = useMemo(
    () => buildCategoryChart(monthClaims).map((row) => ({ name: row.cat, value: row.amount })),
    [monthClaims],
  )
  const statusChart = useMemo(() => buildStatusChart(monthClaims), [monthClaims])
  const employeeChart = useMemo(
    () => buildEmployeeSpendRows(monthClaims).map((row) => ({ name: row.employee, value: row.total })),
    [monthClaims],
  )
  const employeeRows = useMemo(() => buildEmployeeSpendRows(monthClaims), [monthClaims])
  const categoryTableRows = useMemo(
    () => buildCategoryChart(monthClaims).map((row) => ({ cat: row.cat, amount: row.amount })),
    [monthClaims],
  )

  const monthLabel = useMemo(() => {
    const [year, month] = monthValue.split('-').map(Number)
    if (!year || !month) return 'Selected period'
    return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  }, [monthValue])

  const handleExport = () => {
    const safeMonth = monthValue || 'all'
    downloadExpenseReportCsv(monthClaims, `expense-report-${safeMonth}.csv`)
  }

  const employeeColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <TableCellText value={row.employee} emphasized />,
      },
      {
        key: 'claims',
        label: 'CLAIMS',
        render: (_, row) => <TableCellText value={String(row.claims)} />,
      },
      {
        key: 'pending',
        label: 'PENDING',
        render: (_, row) => <TableCellText value={String(row.pending)} />,
      },
      {
        key: 'total',
        label: 'TOTAL SPEND',
        render: (_, row) => <TableCellText value={formatExpenseAmount(row.total)} emphasized />,
      },
    ],
    [],
  )

  const categoryColumns = useMemo(
    () => [
      {
        key: 'cat',
        label: 'CATEGORY',
        fixed: true,
        render: (_, row) => <TableCellText value={row.cat} emphasized />,
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => <TableCellText value={formatExpenseAmount(row.amount)} emphasized />,
      },
    ],
    [],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-gray-900">Reporting period</p>
          <p className="text-xs text-gray-500">
            KPIs and charts reflect claims with expense date in {monthLabel}
          </p>
        </div>
        <Input
          type="month"
          value={monthValue}
          onChange={(e) => setMonthValue(e.target.value)}
          className="max-w-[180px]"
          aria-label="Select reporting month"
        />
      </div>

      <HRKpiRow>
        <KPICard
          title="Claimed (Month)"
          value={stats.claimedLabel}
          subtitle={`${stats.total} claim${stats.total === 1 ? '' : 's'} in ${monthLabel}`}
          icon={Receipt}
          colorScheme="orange"
        />
        <KPICard
          title="Approved"
          value={stats.approvedLabel}
          subtitle={`${stats.approved} approved`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Pending"
          value={stats.pendingLabel}
          subtitle={`${stats.pending} awaiting review`}
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Rejected"
          value={stats.rejectedLabel}
          subtitle={stats.rejected === 0 ? 'No rejections' : `${stats.rejected} declined`}
          icon={XCircle}
          colorScheme="orange"
        />
      </HRKpiRow>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: String(item.count),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showExport
        onExportClick={handleExport}
        exportTitle="Export CSV"
        variant="glass"
      />

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ExpensesSpendBarChart
            title="Spend by category"
            subtitle={`Total claimed amount per category · ${monthLabel}`}
            icon={BarChart3}
            data={categoryChart}
            emptyMessage={`No category spend recorded for ${monthLabel}.`}
          />
          <ExpensesSpendStatusDonut
            title="Spend by status"
            subtitle="Pending, approved, rejected, and paid totals"
            icon={CheckCircle}
            data={statusChart}
            emptyMessage={`No claims to summarize for ${monthLabel}.`}
          />
        </div>
      ) : null}

      {activeTab === 'category' ? (
        <div className="space-y-6">
          <ExpensesSpendBarChart
            title="Category breakdown"
            subtitle={`Visual comparison of spend across categories · ${monthLabel}`}
            icon={BarChart3}
            data={categoryChart}
            emptyMessage={`No category spend recorded for ${monthLabel}.`}
          />
          <TableResultsCount count={categoryTableRows.length} />
          <HRDataTableCard>
            {categoryTableRows.length ? (
              <Table columns={categoryColumns} data={categoryTableRows} keyField="cat" variant="modernEmbedded" />
            ) : (
              <TableEmptyBelow
                icon={BarChart3}
                title="No category data"
                description={`Claims submitted in ${monthLabel} will appear here.`}
              />
            )}
          </HRDataTableCard>
        </div>
      ) : null}

      {activeTab === 'employee' ? (
        <div className="space-y-6">
          <ExpensesSpendBarChart
            title="Spend by employee"
            subtitle={`Top claimants by total reimbursement value · ${monthLabel}`}
            icon={Users}
            data={employeeChart}
            emptyMessage={`No employee spend recorded for ${monthLabel}.`}
          />
          <TableResultsCount count={employeeRows.length} />
          <HRDataTableCard>
            {employeeRows.length ? (
              <Table columns={employeeColumns} data={employeeRows} keyField="employee" variant="modernEmbedded" />
            ) : (
              <TableEmptyBelow
                icon={Users}
                title="No employee spend data"
                description="Claims from ESS or HR will roll up here by employee."
              />
            )}
          </HRDataTableCard>
        </div>
      ) : null}
    </div>
  )
}
