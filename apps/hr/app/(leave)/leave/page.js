'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Clock,
  CheckCircle,
  XCircle,
  CalendarDays,
  Plus,
  Palmtree,
  FileText,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  TableEmptyBelow,
  TableSortDropdown,
  useTableColumnPreferences,
  useTableSort,
  Modal,
  TableResultsCount,
} from '@webfudge/ui'
import { Select } from '../../../components/shared/HRSelect'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import {
  buildLeaveRequestColumns,
  buildLeaveBalanceColumns,
  buildLeavePolicyColumns,
  resolveVisibleLeaveColumns,
} from '../../../components/leave/leaveTableColumns'
import LeaveCalendarView from '../../../components/leave/LeaveCalendarView'
import {
  computeLeaveStats,
  filterLeaveRequests,
  filterApprovedTabLeaveRequests,
  filterLeaveBalances,
  filterLeavePolicies,
  getLeaveTabItems,
  leaveRequestSortValue,
  leaveBalanceSortValue,
  leavePolicySortValue,
} from '../../../lib/leavePage'
import CreateLeaveRequestModal from '../../../components/leave/CreateLeaveRequestModal'
import LeaveRequestDetailModal from '../../../components/leave/LeaveRequestDetailModal'
import { filterLeaveCalendarRequests } from '../../../lib/leaveCalendar'
import {
  DEFAULT_LEAVE_POLICIES,
  LEAVE_UPDATED_EVENT,
  computeLeaveBalances,
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

const REQUEST_SORT_STORAGE_KEY = 'hr.leave.requests.tableSort'
const REQUEST_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.leave.requests.tableColumnVisibility'
const REQUEST_COLUMN_ORDER_STORAGE_KEY = 'hr.leave.requests.tableColumnOrder'
const REQUEST_COLUMN_WIDTHS_STORAGE_KEY = 'hr.leave.requests.tableColumnWidths'

const BALANCE_SORT_STORAGE_KEY = 'hr.leave.balances.tableSort'
const BALANCE_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.leave.balances.tableColumnVisibility'
const BALANCE_COLUMN_ORDER_STORAGE_KEY = 'hr.leave.balances.tableColumnOrder'
const BALANCE_COLUMN_WIDTHS_STORAGE_KEY = 'hr.leave.balances.tableColumnWidths'

const POLICY_SORT_STORAGE_KEY = 'hr.leave.policies.tableSort'
const POLICY_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.leave.policies.tableColumnVisibility'
const POLICY_COLUMN_ORDER_STORAGE_KEY = 'hr.leave.policies.tableColumnOrder'
const POLICY_COLUMN_WIDTHS_STORAGE_KEY = 'hr.leave.policies.tableColumnWidths'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
]

const REQUEST_DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  type: 150,
  from: 130,
  to: 130,
  days: 90,
  status: 130,
  actions: 160,
}

const BALANCE_DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  cl: 90,
  sl: 90,
  pl: 90,
  compOff: 120,
  lop: 90,
}

const POLICY_DEFAULT_COLUMN_WIDTHS = {
  name: 220,
  type: 120,
  entitlement: 140,
  carryForward: 150,
  encashable: 120,
}

const MIN_COLUMN_WIDTHS = { actions: 140 }

const REQUEST_TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Leave type' },
  { key: 'from', label: 'From date' },
  { key: 'to', label: 'To date' },
  { key: 'days', label: 'Days' },
  { key: 'status', label: 'Status' },
]

const BALANCE_TOGGLEABLE_COLUMNS = [
  { key: 'cl', label: 'Casual leave' },
  { key: 'sl', label: 'Sick leave' },
  { key: 'pl', label: 'Privilege leave' },
  { key: 'compOff', label: 'Comp-off' },
  { key: 'lop', label: 'LOP' },
]

const POLICY_TOGGLEABLE_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'entitlement', label: 'Entitlement' },
  { key: 'carryForward', label: 'Carry forward' },
  { key: 'encashable', label: 'Encashable' },
]

const REQUEST_DEFAULT_COLUMN_VISIBILITY = REQUEST_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)
const BALANCE_DEFAULT_COLUMN_VISIBILITY = BALANCE_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)
const POLICY_DEFAULT_COLUMN_VISIBILITY = POLICY_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)

const REQUEST_SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...REQUEST_TOGGLEABLE_COLUMNS]
const BALANCE_SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...BALANCE_TOGGLEABLE_COLUMNS]
const POLICY_SORT_COLUMN_OPTIONS = [{ key: 'name', label: 'Policy' }, ...POLICY_TOGGLEABLE_COLUMNS]

const REQUEST_SORTABLE_KEYS = REQUEST_SORT_COLUMN_OPTIONS.map((c) => c.key)
const BALANCE_SORTABLE_KEYS = BALANCE_SORT_COLUMN_OPTIONS.map((c) => c.key)
const POLICY_SORTABLE_KEYS = POLICY_SORT_COLUMN_OPTIONS.map((c) => c.key)

const REQUEST_REORDERABLE_KEYS = REQUEST_TOGGLEABLE_COLUMNS.map((c) => c.key)
const BALANCE_REORDERABLE_KEYS = BALANCE_TOGGLEABLE_COLUMNS.map((c) => c.key)
const POLICY_REORDERABLE_KEYS = POLICY_TOGGLEABLE_COLUMNS.map((c) => c.key)

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

  const calendarLeaveRows = useMemo(
    () => filterLeaveCalendarRequests(requests, searchQuery),
    [requests, searchQuery],
  )

  const calendarTabCount = useMemo(
    () => filterLeaveCalendarRequests(requests, '').length,
    [requests],
  )

  const tabItems = useMemo(
    () =>
      getLeaveTabItems({
        requests,
        balances,
        policies: DEFAULT_LEAVE_POLICIES,
        calendarCount: calendarTabCount,
      }),
    [requests, balances, calendarTabCount],
  )

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
    visibilityStorageKey: REQUEST_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: REQUEST_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: REQUEST_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: REQUEST_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: REQUEST_REORDERABLE_KEYS,
    defaultWidths: REQUEST_DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    columnVisibility: balanceColumnVisibility,
    columnOrder: balanceColumnOrder,
    columnPickerOpen: balanceColumnPickerOpen,
    setColumnPickerOpen: setBalanceColumnPickerOpen,
    columnDropIndicator: balanceColumnDropIndicator,
    setColumnVisible: setBalanceColumnVisible,
    handleColumnDragStart: handleBalanceColumnDragStart,
    handleColumnDragEnd: handleBalanceColumnDragEnd,
    handleColumnRowDragOver: handleBalanceColumnRowDragOver,
    handleColumnListDragLeave: handleBalanceColumnListDragLeave,
    handleColumnDrop: handleBalanceColumnDrop,
    resetColumnTablePreferences: resetBalanceColumnTablePreferences,
    tableResizeProps: balanceTableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: BALANCE_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: BALANCE_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: BALANCE_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: BALANCE_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: BALANCE_REORDERABLE_KEYS,
    defaultWidths: BALANCE_DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    columnVisibility: policyColumnVisibility,
    columnOrder: policyColumnOrder,
    columnPickerOpen: policyColumnPickerOpen,
    setColumnPickerOpen: setPolicyColumnPickerOpen,
    columnDropIndicator: policyColumnDropIndicator,
    setColumnVisible: setPolicyColumnVisible,
    handleColumnDragStart: handlePolicyColumnDragStart,
    handleColumnDragEnd: handlePolicyColumnDragEnd,
    handleColumnRowDragOver: handlePolicyColumnRowDragOver,
    handleColumnListDragLeave: handlePolicyColumnListDragLeave,
    handleColumnDrop: handlePolicyColumnDrop,
    resetColumnTablePreferences: resetPolicyColumnTablePreferences,
    tableResizeProps: policyTableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: POLICY_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: POLICY_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: POLICY_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: POLICY_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: POLICY_REORDERABLE_KEYS,
    defaultWidths: POLICY_DEFAULT_COLUMN_WIDTHS,
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
  } = useTableSort({ storageKey: REQUEST_SORT_STORAGE_KEY })

  const {
    sortRules: balanceSortRules,
    sortData: balanceSortData,
    bindSortableColumns: bindBalanceSortableColumns,
    hasActiveSort: hasBalanceActiveSort,
    addSortRule: addBalanceSortRule,
    removeSortRule: removeBalanceSortRule,
    setRuleDirection: setBalanceRuleDirection,
    moveSortRule: moveBalanceSortRule,
    clearSort: clearBalanceSort,
    maxRules: balanceSortMaxRules,
  } = useTableSort({ storageKey: BALANCE_SORT_STORAGE_KEY })

  const {
    sortRules: policySortRules,
    sortData: policySortData,
    bindSortableColumns: bindPolicySortableColumns,
    hasActiveSort: hasPolicyActiveSort,
    addSortRule: addPolicySortRule,
    removeSortRule: removePolicySortRule,
    setRuleDirection: setPolicyRuleDirection,
    moveSortRule: movePolicySortRule,
    clearSort: clearPolicySort,
    maxRules: policySortMaxRules,
  } = useTableSort({ storageKey: POLICY_SORT_STORAGE_KEY })

  const requestRows = useMemo(() => {
    if (activeTab === 'approved') {
      return filterApprovedTabLeaveRequests(requests, { search: searchQuery })
    }
    return filterLeaveRequests(requests, { search: searchQuery, statusFilter })
  }, [requests, searchQuery, statusFilter, activeTab])

  const sortedRequestRows = useMemo(
    () => sortData(requestRows, (row, key) => leaveRequestSortValue(row, key)),
    [requestRows, sortData, sortRules],
  )

  const balanceRows = useMemo(
    () => filterLeaveBalances(balances, searchQuery),
    [balances, searchQuery],
  )

  const policyRows = useMemo(
    () => filterLeavePolicies(DEFAULT_LEAVE_POLICIES, searchQuery).map((policy) => ({ ...policy, id: policy.type })),
    [searchQuery],
  )

  const sortedBalanceRows = useMemo(
    () => balanceSortData(balanceRows, (row, key) => leaveBalanceSortValue(row, key)),
    [balanceRows, balanceSortData, balanceSortRules],
  )

  const sortedPolicyRows = useMemo(
    () => policySortData(policyRows, (row, key) => leavePolicySortValue(row, key)),
    [policyRows, policySortData, policySortRules],
  )

  useEffect(() => {
    setSortPickerOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (!columnPickerOpen && !balanceColumnPickerOpen && !policyColumnPickerOpen && !sortPickerOpen) {
      return undefined
    }
    const onDocMouseDown = (event) => {
      if (toolbarRef.current?.contains(event.target)) return
      setColumnPickerOpen(false)
      setBalanceColumnPickerOpen(false)
      setPolicyColumnPickerOpen(false)
      setSortPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [
    columnPickerOpen,
    balanceColumnPickerOpen,
    policyColumnPickerOpen,
    sortPickerOpen,
    setColumnPickerOpen,
    setBalanceColumnPickerOpen,
    setPolicyColumnPickerOpen,
    toolbarRef,
  ])

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

  const requestColumns = useMemo(
    () =>
      buildLeaveRequestColumns({
        actionId,
        onApprove: handleApprove,
        onReject: handleReject,
        onView: setDetailRequest,
        onDelete: setDeleteTarget,
        showApprovedTabActions: activeTab === 'approved',
        useDeniedLabel: activeTab === 'approved',
      }),
    [actionId, handleApprove, handleReject, activeTab],
  )

  const balanceColumns = useMemo(() => buildLeaveBalanceColumns(), [])
  const policyColumns = useMemo(() => buildLeavePolicyColumns(), [])

  const visibleRequestColumns = useMemo(
    () =>
      resolveVisibleLeaveColumns(
        requestColumns,
        columnOrder,
        columnVisibility,
        bindSortableColumns,
        REQUEST_SORTABLE_KEYS,
      ),
    [requestColumns, columnOrder, columnVisibility, bindSortableColumns],
  )

  const visibleBalanceColumns = useMemo(
    () =>
      resolveVisibleLeaveColumns(
        balanceColumns,
        balanceColumnOrder,
        balanceColumnVisibility,
        bindBalanceSortableColumns,
        BALANCE_SORTABLE_KEYS,
      ),
    [balanceColumns, balanceColumnOrder, balanceColumnVisibility, bindBalanceSortableColumns],
  )

  const visiblePolicyColumns = useMemo(
    () =>
      resolveVisibleLeaveColumns(
        policyColumns,
        policyColumnOrder,
        policyColumnVisibility,
        bindPolicySortableColumns,
        POLICY_SORTABLE_KEYS,
        'name',
      ),
    [policyColumns, policyColumnOrder, policyColumnVisibility, bindPolicySortableColumns],
  )

  const activeTableContext = useMemo(() => {
    if (activeTab === 'balances') {
      return {
        sortRules: balanceSortRules,
        sortColumnOptions: BALANCE_SORT_COLUMN_OPTIONS,
        hasActiveSort: hasBalanceActiveSort,
        reorderableColumns: BALANCE_TOGGLEABLE_COLUMNS,
        columnVisibility: balanceColumnVisibility,
        columnOrder: balanceColumnOrder,
        columnDropIndicator: balanceColumnDropIndicator,
        setColumnVisible: setBalanceColumnVisible,
        handleColumnDragStart: handleBalanceColumnDragStart,
        handleColumnDragEnd: handleBalanceColumnDragEnd,
        handleColumnRowDragOver: handleBalanceColumnRowDragOver,
        handleColumnListDragLeave: handleBalanceColumnListDragLeave,
        handleColumnDrop: handleBalanceColumnDrop,
        resetColumnTablePreferences: resetBalanceColumnTablePreferences,
        addSortRule: addBalanceSortRule,
        removeSortRule: removeBalanceSortRule,
        setRuleDirection: setBalanceRuleDirection,
        moveSortRule: moveBalanceSortRule,
        clearSort: clearBalanceSort,
        sortMaxRules: balanceSortMaxRules,
        columnPickerOpen: balanceColumnPickerOpen,
        setColumnPickerOpen: setBalanceColumnPickerOpen,
        pickerDescription: 'Employee name stays visible.',
        tableResizeProps: balanceTableResizeProps,
      }
    }

    if (activeTab === 'policies') {
      return {
        sortRules: policySortRules,
        sortColumnOptions: POLICY_SORT_COLUMN_OPTIONS,
        hasActiveSort: hasPolicyActiveSort,
        reorderableColumns: POLICY_TOGGLEABLE_COLUMNS,
        columnVisibility: policyColumnVisibility,
        columnOrder: policyColumnOrder,
        columnDropIndicator: policyColumnDropIndicator,
        setColumnVisible: setPolicyColumnVisible,
        handleColumnDragStart: handlePolicyColumnDragStart,
        handleColumnDragEnd: handlePolicyColumnDragEnd,
        handleColumnRowDragOver: handlePolicyColumnRowDragOver,
        handleColumnListDragLeave: handlePolicyColumnListDragLeave,
        handleColumnDrop: handlePolicyColumnDrop,
        resetColumnTablePreferences: resetPolicyColumnTablePreferences,
        addSortRule: addPolicySortRule,
        removeSortRule: removePolicySortRule,
        setRuleDirection: setPolicyRuleDirection,
        moveSortRule: movePolicySortRule,
        clearSort: clearPolicySort,
        sortMaxRules: policySortMaxRules,
        columnPickerOpen: policyColumnPickerOpen,
        setColumnPickerOpen: setPolicyColumnPickerOpen,
        pickerDescription: 'Policy name stays visible.',
        tableResizeProps: policyTableResizeProps,
      }
    }

    if (activeTab === 'requests' || activeTab === 'approved') {
      return {
        sortRules,
        sortColumnOptions: REQUEST_SORT_COLUMN_OPTIONS,
        hasActiveSort,
        reorderableColumns: REQUEST_TOGGLEABLE_COLUMNS,
        columnVisibility,
        columnOrder,
        columnDropIndicator,
        setColumnVisible,
        handleColumnDragStart,
        handleColumnDragEnd,
        handleColumnRowDragOver,
        handleColumnListDragLeave,
        handleColumnDrop,
        resetColumnTablePreferences,
        addSortRule,
        removeSortRule,
        setRuleDirection,
        moveSortRule,
        clearSort,
        sortMaxRules,
        columnPickerOpen,
        setColumnPickerOpen,
        pickerDescription: 'Employee name and actions stay visible.',
        tableResizeProps,
      }
    }

    return null
  }, [
    activeTab,
    balanceSortRules,
    hasBalanceActiveSort,
    balanceColumnVisibility,
    balanceColumnOrder,
    balanceColumnDropIndicator,
    setBalanceColumnVisible,
    handleBalanceColumnDragStart,
    handleBalanceColumnDragEnd,
    handleBalanceColumnRowDragOver,
    handleBalanceColumnListDragLeave,
    handleBalanceColumnDrop,
    resetBalanceColumnTablePreferences,
    addBalanceSortRule,
    removeBalanceSortRule,
    setBalanceRuleDirection,
    moveBalanceSortRule,
    clearBalanceSort,
    balanceSortMaxRules,
    balanceColumnPickerOpen,
    setBalanceColumnPickerOpen,
    balanceTableResizeProps,
    policySortRules,
    hasPolicyActiveSort,
    policyColumnVisibility,
    policyColumnOrder,
    policyColumnDropIndicator,
    setPolicyColumnVisible,
    handlePolicyColumnDragStart,
    handlePolicyColumnDragEnd,
    handlePolicyColumnRowDragOver,
    handlePolicyColumnListDragLeave,
    handlePolicyColumnDrop,
    resetPolicyColumnTablePreferences,
    addPolicySortRule,
    removePolicySortRule,
    setPolicyRuleDirection,
    movePolicySortRule,
    clearPolicySort,
    policySortMaxRules,
    policyColumnPickerOpen,
    setPolicyColumnPickerOpen,
    policyTableResizeProps,
    sortRules,
    hasActiveSort,
    columnVisibility,
    columnOrder,
    columnDropIndicator,
    setColumnVisible,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnRowDragOver,
    handleColumnListDragLeave,
    handleColumnDrop,
    resetColumnTablePreferences,
    addSortRule,
    removeSortRule,
    setRuleDirection,
    moveSortRule,
    clearSort,
    sortMaxRules,
    columnPickerOpen,
    setColumnPickerOpen,
    tableResizeProps,
  ])


  const resultCount =
    activeTab === 'requests' || activeTab === 'approved'
      ? requestRows.length
      : activeTab === 'balances'
        ? balanceRows.length
        : activeTab === 'calendar'
          ? calendarLeaveRows.length
          : activeTab === 'policies'
            ? policyRows.length
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

      <TabsWithActions
        tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pill"
      />

      <div className="relative ml-auto w-fit max-w-full" ref={toolbarRef}>
        <TabsWithActions
          showTabs={false}
          activeTab={activeTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={
            activeTab === 'balances'
              ? 'Search balances...'
              : activeTab === 'policies'
                ? 'Search policies...'
                : activeTab === 'calendar'
                  ? 'Search calendar...'
                  : 'Search leave requests...'
          }
          showSort={Boolean(activeTableContext)}
          onSortClick={() => setSortPickerOpen((open) => !open)}
          hasActiveSort={Boolean(activeTableContext?.hasActiveSort)}
          sortTitle="Sort"
          variant="glass"
        />
        {activeTableContext ? (
          <TableSortDropdown
            open={sortPickerOpen}
            sortRules={activeTableContext.sortRules}
            columnOptions={activeTableContext.sortColumnOptions}
            onAddRule={activeTableContext.addSortRule}
            onRemoveRule={activeTableContext.removeSortRule}
            onSetDirection={activeTableContext.setRuleDirection}
            onMoveRule={activeTableContext.moveSortRule}
            onClear={activeTableContext.clearSort}
            maxRules={activeTableContext.sortMaxRules}
          />
        ) : null}
      </div>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading leave data…</p> : null}

      <TableResultsCount count={resultCount} />

      {(activeTab === 'requests' || activeTab === 'approved') && (
        <HRDataTableCard>
          <Table
            columns={visibleRequestColumns}
            data={sortedRequestRows}
            keyField="id"
            variant="modernEmbedded"
            {...activeTableContext?.tableResizeProps}
            onRowClick={(row) => setDetailRequest(row)}
          />
          {!loading && requestRows.length === 0 ? (
            <TableEmptyBelow
              icon={activeTab === 'approved' ? CheckCircle : Palmtree}
              title={activeTab === 'approved' ? 'No approved or denied requests' : 'No leave requests found'}
              description={
                activeTab === 'approved'
                  ? 'Approved and denied requests will appear here for review.'
                  : 'Apply leave for an employee to get started.'
              }
              action={
                activeTab === 'requests' ? (
                  <Button variant="primary" className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Apply Leave
                  </Button>
                ) : null
              }
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'balances' && (
        <HRDataTableCard>
          <Table
            columns={visibleBalanceColumns}
            data={sortedBalanceRows}
            keyField="employeeId"
            variant="modernEmbedded"
            {...activeTableContext?.tableResizeProps}
          />
          {!loading && balanceRows.length === 0 ? (
            <TableEmptyBelow icon={CalendarDays} title="No balance records found" description="Add employees to see leave balances." />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'calendar' && (
        <LeaveCalendarView
          requests={calendarLeaveRows}
          onEventClick={setDetailRequest}
        />
      )}

      {activeTab === 'policies' && (
        <HRDataTableCard>
          <Table
            columns={visiblePolicyColumns}
            data={sortedPolicyRows}
            keyField="id"
            variant="modernEmbedded"
            {...activeTableContext?.tableResizeProps}
          />
          {policyRows.length === 0 ? (
            <TableEmptyBelow icon={FileText} title="No leave policies" description="Configure leave policies in HR settings." />
          ) : null}
        </HRDataTableCard>
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
