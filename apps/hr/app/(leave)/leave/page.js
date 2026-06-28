'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { Select } from '../../../components/shared/HRSelect'
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
import CreateLeaveRequestModal from '../../../components/leave/CreateLeaveRequestModal'
import LeaveRequestDetailModal from '../../../components/leave/LeaveRequestDetailModal'
import {
  computeLeaveStats,
  filterLeaveRequests,
  filterLeaveBalances,
  getLeaveTabItems,
  leaveRequestSortValue,
} from '../../../lib/leavePage'
import {
  DEFAULT_LEAVE_POLICIES,
  LEAVE_UPDATED_EVENT,
  computeLeaveBalances,
  getApprovedLeavesThisWeek,
  notifyLeaveUpdated,
} from '../../../lib/leaveShared'
import {
  approveLeaveRequest,
  createLeaveRequest,
  deleteLeaveRequest,
  exportLeaveRequestsCsv,
  listLeaveRequests,
  rejectLeaveRequest,
} from '../../../lib/leaveSyncService'
import { listSyncedEmployees } from '../../../lib/employeeSyncService'
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

const MIN_COLUMN_WIDTHS = { actions: 140 }

const TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Leave type' },
  { key: 'from', label: 'From date' },
  { key: 'to', label: 'To date' },
  { key: 'days', label: 'Days' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

export default function LeavePage() {
  const [activeTab, setActiveTab] = useState('requests')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [requests, setRequests] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailRequest, setDetailRequest] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setActionError('')
      const [{ employees: employeeRows }, leaveRows] = await Promise.all([
        listSyncedEmployees(),
        listLeaveRequests(),
      ])
      setEmployees(employeeRows || [])
      setRequests(leaveRows || [])
    } catch (err) {
      setActionError(err?.message || 'Failed to load leave data')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onUpdated = () => loadData()
    window.addEventListener(LEAVE_UPDATED_EVENT, onUpdated)
    return () => window.removeEventListener(LEAVE_UPDATED_EVENT, onUpdated)
  }, [loadData])

  const balances = useMemo(
    () => computeLeaveBalances(employees, requests),
    [employees, requests],
  )

  const stats = useMemo(() => computeLeaveStats(requests), [requests])
  const tabItems = useMemo(
    () => getLeaveTabItems({ requests, balances, policies: DEFAULT_LEAVE_POLICIES }),
    [requests, balances],
  )

  const onLeaveThisWeek = useMemo(() => getApprovedLeavesThisWeek(requests), [requests])

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
    reorderableKeys: TOGGLEABLE_COLUMNS.map((c) => c.key),
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
    () => filterLeaveRequests(requests, { search: searchQuery, statusFilter }),
    [requests, searchQuery, statusFilter],
  )

  const sortedRequestRows = useMemo(
    () => sortData(requestRows, (row, key) => leaveRequestSortValue(row, key)),
    [requestRows, sortData, sortRules],
  )

  const balanceRows = useMemo(
    () => filterLeaveBalances(balances, searchQuery),
    [balances, searchQuery],
  )

  useEffect(() => {
    if (!columnPickerOpen && !sortPickerOpen) return undefined
    const onDocMouseDown = (event) => {
      if (toolbarRef.current?.contains(event.target)) return
      setColumnPickerOpen(false)
      setSortPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [columnPickerOpen, sortPickerOpen, setColumnPickerOpen, toolbarRef])

  const handleCreate = useCallback(async (payload) => {
    await createLeaveRequest(payload)
    await loadData()
    notifyLeaveUpdated()
    setActiveTab('requests')
  }, [loadData])

  const handleApprove = useCallback(
    async (id) => {
      try {
        setActionId(id)
        setActionError('')
        await approveLeaveRequest(id)
        await loadData()
        notifyLeaveUpdated()
        setDetailRequest((current) => (current?.id === id ? null : current))
      } catch (err) {
        setActionError(err?.message || 'Failed to approve leave request')
      } finally {
        setActionId(null)
      }
    },
    [loadData],
  )

  const handleReject = useCallback(
    async (id) => {
      try {
        setActionId(id)
        setActionError('')
        await rejectLeaveRequest(id)
        await loadData()
        notifyLeaveUpdated()
        setDetailRequest(null)
      } catch (err) {
        setActionError(err?.message || 'Failed to reject leave request')
      } finally {
        setActionId(null)
      }
    },
    [loadData],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) return
    try {
      setActionId(deleteTarget.id)
      setActionError('')
      await deleteLeaveRequest(deleteTarget.id)
      await loadData()
      notifyLeaveUpdated()
      setDeleteTarget(null)
    } catch (err) {
      setActionError(err?.message || 'Failed to delete leave request')
    } finally {
      setActionId(null)
    }
  }, [deleteTarget, loadData])

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
        render: (_, row) => (
          <div className="flex justify-end gap-0.5" onClick={(event) => event.stopPropagation()}>
            {row.status === 'Pending' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-emerald-600 hover:bg-emerald-50"
                  title="Approve"
                  disabled={actionId === row.id}
                  onClick={() => handleApprove(row.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="p-2 text-red-600 hover:bg-red-50"
                  title="Reject"
                  disabled={actionId === row.id}
                  onClick={() => handleReject(row.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : null}
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="View details"
              onClick={() => setDetailRequest(row)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Delete request"
              disabled={actionId === row.id}
              onClick={() => setDeleteTarget(row)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleApprove, handleReject],
  )

  const visibleRequestColumns = useMemo(() => {
    const byKey = Object.fromEntries(requestTableColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey || !columnVisibility[col.visibilityKey]) continue
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
      { key: 'cl', label: 'CL', render: (_, row) => <LeaveTextCell value={String(row.cl)} emphasized /> },
      { key: 'sl', label: 'SL', render: (_, row) => <LeaveTextCell value={String(row.sl)} /> },
      { key: 'pl', label: 'PL', render: (_, row) => <LeaveTextCell value={String(row.pl)} /> },
      { key: 'compOff', label: 'COMP-OFF', render: (_, row) => <LeaveTextCell value={String(row.compOff)} /> },
      { key: 'lop', label: 'LOP', render: (_, row) => <LeaveTextCell value={String(row.lop)} /> },
    ],
    [],
  )

  const resultCount =
    activeTab === 'requests'
      ? requestRows.length
      : activeTab === 'balances'
        ? balanceRows.length
        : activeTab === 'policies'
          ? DEFAULT_LEAVE_POLICIES.length
          : 0

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Leave"
        subtitle="Manage leave requests, balances, policies, and team availability across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Leave', href: '/leave' }]}
        showProfile
        showActions
        onImportClick={() => setActionError('CSV import is not available yet. Use Apply Leave to add requests.')}
        onExportClick={() => exportLeaveRequestsCsv(requests)}
      />

      <HRKpiRow>
        <KPICard title="Pending" value={stats.pending} subtitle={stats.pending === 1 ? '1 request pending' : `${stats.pending} requests pending`} icon={Clock} colorScheme="orange" />
        <KPICard title="Approved" value={stats.approved} subtitle={`${stats.approved} approved requests`} icon={CheckCircle} colorScheme="orange" />
        <KPICard title="Rejected" value={stats.rejected} subtitle={`${stats.rejected} rejected requests`} icon={XCircle} colorScheme="orange" />
        <KPICard title="Total Requests" value={stats.total} subtitle={`${stats.total} requests`} icon={CalendarDays} colorScheme="orange" />
      </HRKpiRow>

      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search leave..."
          showAdd={activeTab === 'requests'}
          onAddClick={() => setCreateOpen(true)}
          addTitle="Apply Leave"
          showFilter={activeTab === 'requests'}
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(statusFilter)}
          showColumnVisibility={activeTab === 'requests'}
          onColumnVisibilityClick={() => {
            setSortPickerOpen(false)
            setColumnPickerOpen((open) => !open)
          }}
          showSort={activeTab === 'requests'}
          onSortClick={() => {
            setColumnPickerOpen(false)
            setSortPickerOpen((open) => !open)
          }}
          hasActiveSort={hasActiveSort}
          variant="glass"
        />
        <TableSortDropdown
          open={sortPickerOpen && activeTab === 'requests'}
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
          open={columnPickerOpen && activeTab === 'requests'}
          description="Employee name and actions stay visible."
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

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading leave data…</p> : null}

      <TableResultsCount count={resultCount} />

      {activeTab === 'requests' && (
        <HRDataTableCard>
          <Table
            columns={visibleRequestColumns}
            data={sortedRequestRows}
            keyField="id"
            variant="modernEmbedded"
            {...tableResizeProps}
            onRowClick={(row) => setDetailRequest(row)}
          />
          {!loading && requestRows.length === 0 ? (
            <TableEmptyBelow
              icon={Palmtree}
              title="No leave requests found"
              description="Apply leave for an employee to get started."
              action={
                <Button variant="primary" className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Apply Leave
                </Button>
              }
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'balances' && (
        <HRDataTableCard>
          <Table columns={balanceColumns} data={balanceRows} keyField="employeeId" variant="modernEmbedded" />
          {!loading && balanceRows.length === 0 ? (
            <TableEmptyBelow icon={CalendarDays} title="No balance records found" description="Add employees to see leave balances." />
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
                {stats.approved} approved leave request{stats.approved === 1 ? '' : 's'} this year. Full calendar view coming soon.
              </p>
            </div>
          </Card>
          <Card variant="elevated">
            <h3 className="mb-4 font-semibold text-gray-900">Who&apos;s on leave this week</h3>
            {onLeaveThisWeek.length ? (
              <ul className="space-y-3">
                {onLeaveThisWeek.map((item) => (
                  <li key={`${item.name}-${item.detail}`} className="rounded-xl border border-white/60 bg-white/50 px-3 py-2.5 text-sm">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="mt-0.5 block text-gray-500">{item.detail}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No approved leave this week.</p>
            )}
          </Card>
        </div>
      )}

      {activeTab === 'policies' && (
        <div className="space-y-4">
          {DEFAULT_LEAVE_POLICIES.filter((p) => p.type !== 'WFH').map((p) => (
            <Card key={p.type} variant="elevated" className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50">
                  <FileText className="h-5 w-5 text-orange-600" aria-hidden />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {p.entitlement}/yr · carry-forward {p.carryForward} · {p.encashable ? 'encashable' : 'not encashable'}
                  </p>
                </div>
              </div>
              <TableCellOrangePill value={p.type} />
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Leave" size="md">
        <div className="space-y-5">
          <Select label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} placeholder="All statuses" />
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setStatusFilter('')}>Clear</Button>
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => !actionId && setDeleteTarget(null)}
        title="Delete leave request"
        size="md"
      >
        <p className="text-sm text-gray-600">
          Delete leave request for <strong>{deleteTarget?.employeeName}</strong> ({deleteTarget?.type})?
        </p>
        <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" disabled={Boolean(actionId)} onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="primary" className="bg-red-600 hover:bg-red-700" disabled={Boolean(actionId)} onClick={handleDelete}>
            {actionId ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </Modal>

      <CreateLeaveRequestModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        employees={employees}
        onSaved={handleCreate}
      />

      <LeaveRequestDetailModal
        open={Boolean(detailRequest)}
        onClose={() => setDetailRequest(null)}
        request={detailRequest}
        onApprove={handleApprove}
        onReject={handleReject}
        actionId={actionId}
      />
    </HRModulePage>
  )
}
