'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  Plus,
  Calendar,
  FileText,
  Palmtree,
  Eye,
  Trash2,
  Check,
  X,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Select,
  TableCellCreated,
  TableCellOrangePill,
  TableEmptyBelow,
  TableColumnPicker,
  TableSortDropdown,
  useTableColumnPreferences,
  useTableSort,
  Card,
  Modal,
  TableResultsCount,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import {
  LeaveEmployeeCell,
  LeaveBalanceEmployeeCell,
  LeaveTypeCell,
  LeaveTextCell,
  LeaveStatusPill,
} from '../../../components/leave/LeaveTableCells'
import { LEAVE_REQUESTS, LEAVE_BALANCES, LEAVE_POLICIES } from '../../../lib/mock-data/leave'
import {
  computeLeaveStats,
  filterLeaveRequests,
  filterLeaveBalances,
  getLeaveTabItems,
} from '../../../lib/leavePage'
import { useHRQuickActions } from '../../../components/quick-actions/HRQuickActionsContext'
import { HR_QUICK_ACTION_IDS } from '../../../lib/quickActions'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'

const TABLE_SORT_STORAGE_KEY = 'hr.leave.requests.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.leave.requests.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.leave.requests.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.leave.requests.tableColumnWidths'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
]

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  type: 150,
  from: 130,
  to: 130,
  days: 90,
  status: 130,
  actions: 160,
}

const MIN_COLUMN_WIDTHS = {
  actions: 140,
}

const TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Leave type' },
  { key: 'from', label: 'From date' },
  { key: 'to', label: 'To date' },
  { key: 'days', label: 'Days' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_ON_COLUMN_KEYS = new Set(['type', 'from', 'to', 'days', 'status'])
const REORDERABLE_COLUMN_KEYS = TOGGLEABLE_COLUMNS.map((c) => c.key)
const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => {
  acc[key] = DEFAULT_ON_COLUMN_KEYS.has(key)
  return acc
}, {})

const SORT_COLUMN_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  ...TOGGLEABLE_COLUMNS,
]

const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

const ON_LEAVE_THIS_WEEK = [
  { name: 'Sneha Reddy', detail: 'PL until Jun 24' },
  { name: 'Priya Nair', detail: 'SL Jun 3' },
  { name: 'Divya Menon', detail: 'PL from Jun 15' },
]

function getLeaveSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.employeeName || ''
    case 'type':
      return row.type || ''
    case 'from':
      return row.from || ''
    case 'to':
      return row.to || ''
    case 'days':
      return row.days ?? 0
    case 'status':
      return row.status || ''
    default:
      return row[key]
  }
}

export default function LeavePage() {
  const router = useRouter()
  const { openQuickAction } = useHRQuickActions()
  const [activeTab, setActiveTab] = useState('requests')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const stats = useMemo(() => computeLeaveStats(LEAVE_REQUESTS), [])
  const tabItems = useMemo(() => getLeaveTabItems(), [])

  const {
    columnVisibility,
    columnOrder,
    columnPickerOpen,
    setColumnPickerOpen,
    columnDropIndicator,
    toolbarRef,
    setColumnVisible,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnRowDragOver,
    handleColumnListDragLeave,
    handleColumnDrop,
    resetColumnTablePreferences,
    tableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: REORDERABLE_COLUMN_KEYS,
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    sortRules,
    sortData,
    bindSortableColumns,
    hasActiveSort,
    addSortRule,
    removeSortRule,
    setRuleDirection,
    moveSortRule,
    clearSort,
    maxRules: sortMaxRules,
  } = useTableSort({ storageKey: TABLE_SORT_STORAGE_KEY })

  const requestRows = useMemo(
    () => filterLeaveRequests(LEAVE_REQUESTS, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const sortedRequestRows = useMemo(
    () => sortData(requestRows, (row, key) => getLeaveSortValue(row, key)),
    [requestRows, sortData, sortRules]
  )

  const balanceRows = useMemo(
    () => filterLeaveBalances(LEAVE_BALANCES, searchQuery),
    [searchQuery]
  )

  useEffect(() => {
    if (!columnPickerOpen && !sortPickerOpen) return
    const onDocMouseDown = (event) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target)) {
        setColumnPickerOpen(false)
        setSortPickerOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortPickerOpen, setColumnPickerOpen])

  const requestTableColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <LeaveEmployeeCell row={row} />,
      },
      {
        key: 'type',
        visibilityKey: 'type',
        label: 'TYPE',
        render: (_, row) => <LeaveTypeCell type={row.type} />,
      },
      {
        key: 'from',
        visibilityKey: 'from',
        label: 'FROM',
        render: (_, row) => <TableCellCreated dateString={row.from} dateMode="calendar" />,
      },
      {
        key: 'to',
        visibilityKey: 'to',
        label: 'TO',
        render: (_, row) => <TableCellCreated dateString={row.to} dateMode="calendar" />,
      },
      {
        key: 'days',
        visibilityKey: 'days',
        label: 'DAYS',
        render: (_, row) => <LeaveTextCell value={String(row.days)} emphasized />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <LeaveStatusPill status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        resizable: false,
        width: 160,
        defaultWidth: '160px',
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div
            className="flex min-w-[140px] shrink-0 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
            {row.status === 'Pending' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-emerald-600 hover:bg-emerald-50"
                  title="Approve"
                  onClick={(event) => {
                    event.stopPropagation()
                    console.log('Approve', row.id)
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-red-600 hover:bg-red-50"
                  title="Reject"
                  onClick={(event) => {
                    event.stopPropagation()
                    console.log('Reject', row.id)
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View employee"
              onClick={(event) => {
                event.stopPropagation()
                router.push(`/employees/${row.employeeId}`)
              }}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete request"
              onClick={(event) => {
                event.stopPropagation()
                console.log('Delete leave request', row.id)
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [router]
  )

  const visibleRequestColumns = useMemo(() => {
    const byKey = Object.fromEntries(requestTableColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey) continue
      if (!columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return activeTab === 'requests' ? bindSortableColumns(out, SORTABLE_KEYS) : out
  }, [columnOrder, columnVisibility, requestTableColumns, activeTab, bindSortableColumns])

  const balanceColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <LeaveBalanceEmployeeCell row={row} />,
      },
      {
        key: 'cl',
        label: 'CL',
        render: (_, row) => <LeaveTextCell value={String(row.cl)} emphasized />,
      },
      {
        key: 'sl',
        label: 'SL',
        render: (_, row) => <LeaveTextCell value={String(row.sl)} />,
      },
      {
        key: 'pl',
        label: 'PL',
        render: (_, row) => <LeaveTextCell value={String(row.pl)} />,
      },
      {
        key: 'compOff',
        label: 'COMP-OFF',
        render: (_, row) => <LeaveTextCell value={String(row.compOff)} />,
      },
      {
        key: 'lop',
        label: 'LOP',
        render: (_, row) => <LeaveTextCell value={String(row.lop)} />,
      },
    ],
    []
  )

  const showTableToolbar = activeTab === 'requests'

  const resultCount =
    activeTab === 'requests'
      ? requestRows.length
      : activeTab === 'balances'
        ? balanceRows.length
        : activeTab === 'policies'
          ? LEAVE_POLICIES.length
          : 0

  const emptyRequests = {
    icon: Palmtree,
    title: 'No leave requests found',
    description: 'Try adjusting your search or status filter.',
    action: (
      <Button variant="primary" onClick={() => openQuickAction(HR_QUICK_ACTION_IDS.APPLY_LEAVE)}>
        <Plus className="mr-2 h-4 w-4" />
        Apply Leave
      </Button>
    ),
  }

  const emptyBalances = {
    icon: CalendarDays,
    title: 'No balance records found',
    description: 'Try adjusting your search.',
    action: null,
  }

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Leave"
        subtitle="Manage leave requests, balances, policies, and team availability across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Leave', href: '/leave' }]}
        showProfile
        showActions
        onImportClick={() => console.log('Import leave')}
        onExportClick={() => console.log('Export leave')}
      />

      <HRKpiRow>
        <KPICard
          title="Pending"
          value={stats.pending}
          subtitle={
            stats.pending === 0
              ? 'All caught up'
              : stats.pending === 1
                ? '1 request pending'
                : `${stats.pending} requests pending`
          }
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Approved"
          value={stats.approved}
          subtitle={
            stats.approved === 0
              ? 'No approvals'
              : stats.approved === 1
                ? '1 approved request'
                : `${stats.approved} approved requests`
          }
          icon={CheckCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Rejected"
          value={stats.rejected}
          subtitle={
            stats.rejected === 0
              ? 'No rejections'
              : stats.rejected === 1
                ? '1 rejected request'
                : `${stats.rejected} rejected requests`
          }
          icon={XCircle}
          colorScheme="orange"
        />
        <KPICard
          title="Total Requests"
          value={stats.total}
          subtitle={
            stats.total === 0
              ? 'No requests'
              : stats.total === 1
                ? '1 request'
                : `${stats.total} requests`
          }
          icon={CalendarDays}
          colorScheme="orange"
        />
      </HRKpiRow>

      <div className="relative" ref={toolbarRef}>
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
          searchPlaceholder="Search leave..."
          showAdd
          onAddClick={() => openQuickAction(HR_QUICK_ACTION_IDS.APPLY_LEAVE)}
          addTitle="Apply Leave"
          showFilter
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(statusFilter)}
          filterTitle={statusFilter ? 'Status filter active' : 'Filter leave'}
          showColumnVisibility={showTableToolbar}
          onColumnVisibilityClick={() => {
            setSortPickerOpen(false)
            setColumnPickerOpen((open) => !open)
          }}
          columnVisibilityTitle="Show or hide columns"
          showSort={showTableToolbar}
          onSortClick={() => {
            setColumnPickerOpen(false)
            setSortPickerOpen((open) => !open)
          }}
          hasActiveSort={hasActiveSort}
          sortTitle="Sort leave requests (Shift+click headers for multi-sort)"
          variant="glass"
        />
        <TableSortDropdown
          open={sortPickerOpen && showTableToolbar}
          sortRules={sortRules}
          columnOptions={SORT_COLUMN_OPTIONS}
          onAddRule={addSortRule}
          onRemoveRule={removeSortRule}
          onSetDirection={setRuleDirection}
          onMoveRule={moveSortRule}
          onClear={clearSort}
          maxRules={sortMaxRules}
        />
        <TableColumnPicker
          open={columnPickerOpen && showTableToolbar}
          description="Employee name and actions stay visible. Drag column edges in the table to resize."
          reorderableRows={TOGGLEABLE_COLUMNS}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          columnDropIndicator={columnDropIndicator}
          onSetVisible={setColumnVisible}
          onDragStart={handleColumnDragStart}
          onDragEnd={handleColumnDragEnd}
          onRowDragOver={handleColumnRowDragOver}
          onListDragLeave={handleColumnListDragLeave}
          onDrop={handleColumnDrop}
          onReset={resetColumnTablePreferences}
        />
      </div>

      <TableResultsCount count={resultCount} />

      {activeTab === 'requests' && (
        <HRDataTableCard>
          <Table
            columns={visibleRequestColumns}
            data={sortedRequestRows}
            keyField="id"
            variant="modernEmbedded"
            {...tableResizeProps}
            onRowClick={(row) => router.push(`/employees/${row.employeeId}`)}
          />
          {requestRows.length === 0 ? (
            <TableEmptyBelow
              icon={emptyRequests.icon}
              title={emptyRequests.title}
              description={emptyRequests.description}
              action={emptyRequests.action}
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'balances' && (
        <HRDataTableCard>
          <Table columns={balanceColumns} data={balanceRows} keyField="employeeId" variant="modernEmbedded" />
          {balanceRows.length === 0 ? (
            <TableEmptyBelow
              icon={emptyBalances.icon}
              title={emptyBalances.title}
              description={emptyBalances.description}
              action={emptyBalances.action}
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'calendar' && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card variant="elevated" className="lg:col-span-2">
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
          <Card variant="elevated">
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

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Leave" size="md">
        <div className="space-y-5">
          <Select
            label="Status"
            value={statusFilter}
            options={STATUS_OPTIONS}
            onChange={setStatusFilter}
            placeholder="All statuses"
          />
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setStatusFilter('')}>
              Clear
            </Button>
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </Modal>
    </HRModulePage>
  )
}
