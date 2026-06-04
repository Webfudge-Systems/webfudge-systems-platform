'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  Plus,
  Pencil,
  Calendar,
  FileText,
  Palmtree,
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
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { LEAVE_REQUESTS, LEAVE_BALANCES, LEAVE_POLICIES } from '../../../lib/mock-data/leave'
import {
  computeLeaveStats,
  filterLeaveRequests,
  filterLeaveBalances,
  getLeaveTabItems,
} from '../../../lib/leavePage'
import { useHRQuickActions } from '../../../components/quick-actions/HRQuickActionsContext'
import { HR_QUICK_ACTION_IDS } from '../../../lib/quickActions'

const STATUS_FILTERS = ['', 'Pending', 'Approved', 'Rejected']

const SECTION_CARD = 'rounded-2xl border border-gray-200 bg-white p-6 shadow-sm'

const ON_LEAVE_THIS_WEEK = [
  { name: 'Sneha Reddy', detail: 'PL until Jun 24' },
  { name: 'Priya Nair', detail: 'SL Jun 3' },
  { name: 'Divya Menon', detail: 'PL from Jun 15' },
]

export default function LeavePage() {
  const router = useRouter()
  const { openQuickAction } = useHRQuickActions()
  const [activeTab, setActiveTab] = useState('requests')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const stats = useMemo(() => computeLeaveStats(LEAVE_REQUESTS), [])
  const tabItems = useMemo(() => getLeaveTabItems(), [])

  const requestRows = useMemo(
    () => filterLeaveRequests(LEAVE_REQUESTS, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const balanceRows = useMemo(
    () => filterLeaveBalances(LEAVE_BALANCES, searchQuery),
    [searchQuery]
  )

  const requestColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.employeeName} fallback={row.employeeName?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.employeeName}</div>
              <div className="truncate text-sm text-gray-500">{row.employeeId}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'type',
        label: 'TYPE',
        render: (_, row) => <TableCellOrangePill value={row.type} />,
      },
      {
        key: 'from',
        label: 'FROM',
        render: (_, row) => <TableCellDateOnly dateString={row.from} />,
      },
      {
        key: 'to',
        label: 'TO',
        render: (_, row) => <TableCellDateOnly dateString={row.to} />,
      },
      {
        key: 'days',
        label: 'DAYS',
        render: (_, row) => <TableCellText value={String(row.days)} emphasized />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[160px] items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {row.status === 'Pending' ? (
              <>
                <Button variant="primary" size="sm" onClick={() => console.log('Approve', row.id)}>
                  Approve
                </Button>
                <Button variant="secondary" size="sm" onClick={() => console.log('Reject', row.id)}>
                  Reject
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="p-2 text-emerald-600 hover:bg-emerald-50"
                title="View employee"
                onClick={() => router.push(`/employees/${row.employeeId}`)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [router]
  )

  const balanceColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px]">
            <div className="font-medium text-gray-900">{row.employeeName}</div>
            <div className="text-sm text-gray-500">{row.department}</div>
          </div>
        ),
      },
      {
        key: 'cl',
        label: 'CL',
        render: (_, row) => <TableCellText value={String(row.cl)} emphasized />,
      },
      {
        key: 'sl',
        label: 'SL',
        render: (_, row) => <TableCellText value={String(row.sl)} />,
      },
      {
        key: 'pl',
        label: 'PL',
        render: (_, row) => <TableCellText value={String(row.pl)} />,
      },
      {
        key: 'compOff',
        label: 'COMP-OFF',
        render: (_, row) => <TableCellText value={String(row.compOff)} />,
      },
      {
        key: 'lop',
        label: 'LOP',
        render: (_, row) => <TableCellText value={String(row.lop)} />,
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'requests'
      ? requestRows.length
      : activeTab === 'balances'
        ? balanceRows.length
        : activeTab === 'policies'
          ? LEAVE_POLICIES.length
          : 0

  return (
    <div className="min-h-full space-y-6 p-4 md:p-6">
      <HRPageHeader
        title="Leave Management"
        subtitle={`${stats.pending} pending approval${stats.pending === 1 ? '' : 's'} · ${stats.total} total requests`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Leave', href: '/leave' },
        ]}
        showActions
        onImportClick={() => console.log('Import leave')}
        onExportClick={() => console.log('Export leave')}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Pending"
          value={stats.pending}
          subtitle={stats.pending === 0 ? 'All caught up' : 'Awaiting approval'}
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Approved"
          value={stats.approved}
          subtitle={`${stats.approved} approved requests`}
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Rejected"
          value={stats.rejected}
          subtitle={stats.rejected === 0 ? 'No rejections' : `${stats.rejected} declined`}
          icon={XCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Total Requests"
          value={stats.total}
          subtitle="All leave applications"
          icon={CalendarDays}
          colorScheme="orange"
        />
      </div>

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: String(item.count),
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => openQuickAction(HR_QUICK_ACTION_IDS.APPLY_LEAVE)}
        addTitle="Apply Leave"
        showFilter
        onFilterClick={() => console.log('Filter leave')}
        showExport
        onExportClick={() => console.log('Export leave')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'requests' ? (
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
            </div>
          ) : null
        }
      />

      <div className="text-sm text-gray-600">
        Showing <span className="font-semibold text-gray-900">{resultCount}</span> result
        {resultCount !== 1 ? 's' : ''}
      </div>

      {activeTab === 'requests' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table
            columns={requestColumns}
            data={requestRows}
            keyField="id"
            variant="modern"
            onRowClick={(row) => router.push(`/employees/${row.employeeId}`)}
          />
          {requestRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Palmtree className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No leave requests found</h3>
              <p className="mb-4 text-sm text-gray-500">Try adjusting your search or status filter.</p>
              <Button variant="primary" onClick={() => openQuickAction(HR_QUICK_ACTION_IDS.APPLY_LEAVE)}>
                <Plus className="mr-2 h-4 w-4" />
                Apply Leave
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'balances' && (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Table columns={balanceColumns} data={balanceRows} keyField="employeeId" variant="modern" />
          {balanceRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <CalendarDays className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No balance records found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className={`lg:col-span-2 ${SECTION_CARD}`}>
            <div className="flex flex-col items-center py-12 text-center">
              <Calendar className="mb-3 h-12 w-12 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-800">Leave calendar</h3>
              <p className="mt-2 max-w-md text-sm text-gray-500">
                June 2026 team leave calendar — connect to live data for department and holiday overlays.
              </p>
              <Button variant="primary" className="mt-6" onClick={() => console.log('Open calendar')}>
                Open calendar
              </Button>
            </div>
          </Card>
          <Card className={SECTION_CARD}>
            <h3 className="mb-4 font-semibold text-gray-900">Who&apos;s on leave this week</h3>
            <ul className="space-y-3">
              {ON_LEAVE_THIS_WEEK.map((item) => (
                <li
                  key={item.name}
                  className="rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 text-sm"
                >
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="mt-0.5 block text-gray-500">{item.detail}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          {LEAVE_POLICIES.map((p) => (
            <Card key={p.type} variant="elevated" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                  <FileText className="h-5 w-5 text-orange-600" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {p.entitlement}/yr · carry-forward {p.carryForward} ·{' '}
                    {p.encashable ? 'encashable' : 'not encashable'}
                  </p>
                </div>
              </div>
              <TableCellOrangePill value={p.type} />
            </Card>
          ))}
          <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Add Leave Type
          </Button>
        </div>
      )}
    </div>
  )
}
