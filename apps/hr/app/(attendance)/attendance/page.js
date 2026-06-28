'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  UserCheck,
  UserX,
  Home,
  Clock,
  FileSpreadsheet,
  Users,
  Trash2,
  Plus,
  Check,
  CircleDashed,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  TableCellCreated,
  TableEmptyBelow,
  TableColumnPicker,
  TableSortDropdown,
  useTableColumnPreferences,
  useTableSort,
  Card,
  Modal,
  TableResultsCount,
  Input,
} from '@webfudge/ui'
import { Select } from '../../../components/shared/HRSelect'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import MarkAttendanceModal from '../../../components/attendance/MarkAttendanceModal'
import {
  AttendanceEmployeeCell,
  AttendanceTextCell,
  AttendanceStatusPill,
  AttendanceLocationCell,
  AttendancePersonCell,
} from '../../../components/attendance/AttendanceTableCells'
import {
  filterAttendanceLog,
  filterOvertimeRecords,
  getAttendanceTabItems,
  attendanceSortValue,
} from '../../../lib/attendancePage'
import {
  ATTENDANCE_UPDATED_EVENT,
  DEFAULT_SHIFTS,
  buildAttendanceSnapshot,
  buildDailyAttendanceRoster,
  isAttendanceOnLeave,
  monthRange,
  notifyAttendanceUpdated,
  todayDateLabel,
  toDateInputValue,
} from '../../../lib/attendanceShared'
import {
  approveOvertimeRecord,
  deleteAttendanceRecord,
  deleteOvertimeRecord,
  exportAttendanceCsv,
  listAttendanceRecords,
  listOvertimeRecords,
  updateAttendanceRecord,
  upsertAttendanceRecord,
} from '../../../lib/attendanceSyncService'
import { listLeaveRequests } from '../../../lib/leaveSyncService'
import { LEAVE_UPDATED_EVENT } from '../../../lib/leaveShared'
import { listSyncedEmployees } from '../../../lib/employeeSyncService'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'

const TABLE_SORT_STORAGE_KEY = 'hr.attendance.today.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.today.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.today.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.today.tableColumnWidths'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Present', label: 'Present' },
  { value: 'On Leave', label: 'On Leave' },
  { value: 'Not Marked', label: 'Not Marked' },
  { value: 'WFH', label: 'WFH' },
  { value: 'Absent', label: 'Absent' },
]

const DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  clockIn: 100,
  clockOut: 100,
  duration: 110,
  status: 130,
  location: 160,
  actions: 140,
}

const MIN_COLUMN_WIDTHS = { actions: 120 }

const TOGGLEABLE_COLUMNS = [
  { key: 'clockIn', label: 'Clock in' },
  { key: 'clockOut', label: 'Clock out' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

export default function AttendancePage() {
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => toDateInputValue())
  const [monthValue, setMonthValue] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  const [employees, setEmployees] = useState([])
  const [savedRecords, setSavedRecords] = useState([])
  const [monthlyRecords, setMonthlyRecords] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [overtimeRecords, setOvertimeRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionError, setActionError] = useState('')
  const [actionId, setActionId] = useState(null)
  const [markOpen, setMarkOpen] = useState(false)
  const [editRow, setEditRow] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setActionError('')
      const [year, month] = monthValue.split('-').map(Number)
      const { from, to } = monthRange(year, month)

      const [{ employees: employeeRows }, dayRecords, monthRows, leaves, overtime] = await Promise.all([
        listSyncedEmployees(),
        listAttendanceRecords({ date: selectedDate }),
        listAttendanceRecords({ from, to }),
        listLeaveRequests(),
        listOvertimeRecords(),
      ])

      setEmployees(employeeRows || [])
      setSavedRecords(dayRecords || [])
      setMonthlyRecords(monthRows || [])
      setLeaveRequests(leaves || [])
      setOvertimeRecords(overtime || [])
    } catch (err) {
      setActionError(err?.message || 'Failed to load attendance data')
    } finally {
      setLoading(false)
    }
  }, [selectedDate, monthValue])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const onUpdated = () => loadData()
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, onUpdated)
    window.addEventListener(LEAVE_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, onUpdated)
      window.removeEventListener(LEAVE_UPDATED_EVENT, onUpdated)
    }
  }, [loadData])

  const todayRoster = useMemo(
    () =>
      buildDailyAttendanceRoster({
        employees,
        records: savedRecords,
        leaveRequests,
        date: selectedDate,
      }),
    [employees, savedRecords, leaveRequests, selectedDate],
  )

  const snapshot = useMemo(
    () => buildAttendanceSnapshot(todayRoster, employees.filter((e) => e.status !== 'Exited').length),
    [todayRoster, employees],
  )

  const shiftCards = useMemo(
    () =>
      DEFAULT_SHIFTS.map((shift, index) => ({
        ...shift,
        employees: index === 0 ? employees.filter((e) => e.status !== 'Exited').length : 0,
      })),
    [employees],
  )

  const tabItems = useMemo(
    () =>
      getAttendanceTabItems({
        todayCount: todayRoster.length,
        monthlyCount: monthlyRecords.length,
        shiftsCount: shiftCards.length,
        overtimeCount: overtimeRecords.length,
      }),
    [todayRoster.length, monthlyRecords.length, shiftCards.length, overtimeRecords.length],
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

  const todayRows = useMemo(
    () => filterAttendanceLog(todayRoster, { search: searchQuery, statusFilter }),
    [todayRoster, searchQuery, statusFilter],
  )

  const sortedTodayRows = useMemo(
    () => sortData(todayRows, (row, key) => attendanceSortValue(row, key)),
    [todayRows, sortData, sortRules],
  )

  const monthlyRows = useMemo(
    () => filterAttendanceLog(monthlyRecords, { search: searchQuery, statusFilter }),
    [monthlyRecords, searchQuery, statusFilter],
  )

  const overtimeRows = useMemo(() => filterOvertimeRecords(overtimeRecords, searchQuery), [overtimeRecords, searchQuery])

  const handleSaveAttendance = useCallback(
    async (payload) => {
      if (payload.recordId) {
        await updateAttendanceRecord(payload.recordId, {
          attendanceDate: payload.attendanceDate,
          status: payload.status,
          clockIn: payload.clockIn,
          clockOut: payload.clockOut,
          location: payload.location,
          notes: payload.notes,
        })
      } else {
        await upsertAttendanceRecord(payload)
      }
      await loadData()
      notifyAttendanceUpdated()
      setEditRow(null)
    },
    [loadData],
  )

  const handleQuickMark = useCallback(
    async (row, status) => {
      const orgUserId = row.organizationUserId || row.employeeId
      if (!orgUserId) return
      const rowKey = row.id || orgUserId
      const showClock = status === 'present' || status === 'wfh'
      try {
        setActionId(rowKey)
        setActionError('')
        const payload = {
          attendanceDate: selectedDate,
          status,
          clockIn: showClock && row.clockIn && row.clockIn !== '—' ? row.clockIn : showClock ? '09:00' : '',
          clockOut: showClock && row.clockOut && row.clockOut !== '—' ? row.clockOut : showClock ? '18:00' : '',
          location: showClock && row.location && row.location !== '—' ? row.location : showClock ? 'Office' : '',
          notes: row.notes || '',
        }
        if (row.id) {
          await updateAttendanceRecord(row.id, payload)
        } else {
          await upsertAttendanceRecord({ organizationUserId: orgUserId, ...payload })
        }
        await loadData()
        notifyAttendanceUpdated()
      } catch (err) {
        setActionError(err?.message || 'Failed to mark attendance')
      } finally {
        setActionId(null)
      }
    },
    [selectedDate, loadData],
  )

  const handleDelete = useCallback(async () => {
    if (!deleteTarget?.id) return
    try {
      setActionId(deleteTarget.id)
      await deleteAttendanceRecord(deleteTarget.id)
      await loadData()
      notifyAttendanceUpdated()
      setDeleteTarget(null)
    } catch (err) {
      setActionError(err?.message || 'Failed to delete attendance record')
    } finally {
      setActionId(null)
    }
  }, [deleteTarget, loadData])

  const handleApproveOvertime = useCallback(
    async (id) => {
      try {
        setActionId(id)
        await approveOvertimeRecord(id)
        await loadData()
      } catch (err) {
        setActionError(err?.message || 'Failed to approve overtime')
      } finally {
        setActionId(null)
      }
    },
    [loadData],
  )

  const openMarkModal = useCallback((row = null) => {
    setEditRow(row)
    setMarkOpen(true)
  }, [])

  const todayTableColumns = useMemo(
    () => [
      { key: 'employee', label: 'EMPLOYEE', fixed: true, render: (_, row) => <AttendanceEmployeeCell row={row} /> },
      { key: 'clockIn', visibilityKey: 'clockIn', label: 'IN', render: (_, row) => <AttendanceTextCell value={row.clockIn} emphasized /> },
      { key: 'clockOut', visibilityKey: 'clockOut', label: 'OUT', render: (_, row) => <AttendanceTextCell value={row.clockOut} /> },
      { key: 'duration', visibilityKey: 'duration', label: 'DURATION', render: (_, row) => <AttendanceTextCell value={row.duration} /> },
      { key: 'status', visibilityKey: 'status', label: 'STATUS', render: (_, row) => <AttendanceStatusPill status={row.status} /> },
      { key: 'location', visibilityKey: 'location', label: 'LOCATION', render: (_, row) => <AttendanceLocationCell location={row.location} /> },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        resizable: false,
        width: 140,
        render: (_, row) => {
          const rowKey = row.id || row.organizationUserId || row.employeeId
          const busy = actionId === rowKey
          const onLeave = isAttendanceOnLeave(row)

          if (onLeave) {
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <span
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-amber-900"
                  title="Approved leave — auto-detected from Leave module"
                >
                  <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  On leave
                </span>
              </div>
            )
          }

          return (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-emerald-600 hover:bg-emerald-50"
              title="Mark present"
              disabled={busy}
              onClick={() => handleQuickMark(row, 'present')}
            >
              <UserCheck className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-red-600 hover:bg-red-50"
              title="Mark absent"
              disabled={busy}
              onClick={() => handleQuickMark(row, 'absent')}
            >
              <UserX className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="p-2 text-orange-600 hover:bg-orange-50"
              title="Mark attendance (full form)"
              disabled={busy}
              onClick={() => openMarkModal(row)}
            >
              <Clock className="h-4 w-4" />
            </Button>
            {row.id ? (
              <Button variant="ghost" size="sm" className="p-2 text-red-600 hover:bg-red-50" title="Delete" disabled={busy} onClick={() => setDeleteTarget(row)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
          )
        },
      },
    ],
    [actionId, openMarkModal, handleQuickMark],
  )

  const monthlyColumns = useMemo(
    () => [
      { key: 'employee', label: 'EMPLOYEE', fixed: true, render: (_, row) => <AttendanceEmployeeCell row={row} /> },
      { key: 'date', label: 'DATE', render: (_, row) => <TableCellCreated dateString={row.attendanceDate} dateMode="calendar" /> },
      { key: 'clockIn', label: 'IN', render: (_, row) => <AttendanceTextCell value={row.clockIn} /> },
      { key: 'clockOut', label: 'OUT', render: (_, row) => <AttendanceTextCell value={row.clockOut} /> },
      { key: 'status', label: 'STATUS', render: (_, row) => <AttendanceStatusPill status={row.status} /> },
    ],
    [],
  )

  const overtimeColumns = useMemo(
    () => [
      { key: 'employee', label: 'EMPLOYEE', fixed: true, render: (_, row) => <AttendancePersonCell name={row.employee} /> },
      { key: 'date', label: 'DATE', render: (_, row) => <TableCellCreated dateString={row.date} dateMode="calendar" /> },
      { key: 'ot', label: 'OT HRS', render: (_, row) => <AttendanceTextCell value={String(row.ot)} emphasized /> },
      { key: 'amount', label: 'AMOUNT', render: (_, row) => <AttendanceTextCell value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized /> },
      { key: 'status', label: 'STATUS', render: (_, row) => <AttendanceStatusPill status={row.status} /> },
      {
        key: 'actions',
        label: 'ACTIONS',
        render: (_, row) => (
          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {row.statusRaw === 'pending' ? (
              <Button variant="ghost" size="sm" className="p-2 text-emerald-600" disabled={actionId === row.id} onClick={() => handleApproveOvertime(row.id)}>
                <Check className="h-4 w-4" />
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" className="p-2 text-red-600" disabled={actionId === row.id} onClick={async () => { setActionId(row.id); await deleteOvertimeRecord(row.id); await loadData(); setActionId(null) }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ),
      },
    ],
    [actionId, handleApproveOvertime, loadData],
  )

  const visibleTodayColumns = useMemo(() => {
    const byKey = Object.fromEntries(todayTableColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey || !columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return activeTab === 'today' ? bindSortableColumns(out, SORTABLE_KEYS) : out
  }, [columnOrder, columnVisibility, todayTableColumns, activeTab, bindSortableColumns])

  const resultCount =
    activeTab === 'today'
      ? todayRows.length
      : activeTab === 'monthly'
        ? monthlyRows.length
        : activeTab === 'overtime'
          ? overtimeRows.length
          : activeTab === 'shifts'
            ? shiftCards.length
            : 0

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Attendance"
        subtitle="Track daily attendance, shifts, overtime, and workforce presence across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Attendance', href: '/attendance' }]}
        showProfile
        showActions
        onImportClick={() => setActionError('CSV import is not available yet. Use Mark attendance to add records.')}
        onExportClick={() =>
          exportAttendanceCsv(activeTab === 'monthly' ? monthlyRows : todayRows, {
            dateLabel: activeTab === 'monthly' ? monthValue : todayDateLabel(selectedDate),
          })
        }
      />

      <HRKpiRow columns={5}>
        <KPICard title="Present" value={snapshot.present} subtitle={`${snapshot.present} employees`} icon={UserCheck} colorScheme="orange" />
        <KPICard title="On Leave" value={snapshot.onLeave} subtitle={`${snapshot.onLeave} on leave`} icon={Clock} colorScheme="orange" />
        <KPICard title="Not Marked" value={snapshot.notMarked} subtitle={`${snapshot.notMarked} pending`} icon={CircleDashed} colorScheme="orange" />
        <KPICard title="Absent" value={snapshot.absent} subtitle={`${snapshot.absent} marked absent`} icon={UserX} colorScheme="orange" />
        <KPICard title="WFH" value={snapshot.wfh} subtitle={`${snapshot.wfh} remote`} icon={Home} colorScheme="orange" />
      </HRKpiRow>

      {activeTab === 'today' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">{todayDateLabel(selectedDate)}</p>
            <p className="text-xs text-gray-500">
              {snapshot.notMarked} not marked · {snapshot.markedPct}% explicitly marked
            </p>
          </div>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="max-w-[180px]" />
        </div>
      ) : null}

      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Search attendance..."
          showAdd={activeTab === 'today'}
          onAddClick={() => openMarkModal(null)}
          addTitle="Mark attendance"
          showFilter={activeTab === 'today' || activeTab === 'monthly'}
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(statusFilter)}
          showColumnVisibility={activeTab === 'today'}
          onColumnVisibilityClick={() => { setSortPickerOpen(false); setColumnPickerOpen((o) => !o) }}
          showSort={activeTab === 'today'}
          onSortClick={() => { setColumnPickerOpen(false); setSortPickerOpen((o) => !o) }}
          hasActiveSort={hasActiveSort}
          variant="glass"
        />
        <TableSortDropdown open={sortPickerOpen && activeTab === 'today'} sortRules={sortRules} columnOptions={SORT_COLUMN_OPTIONS} onAddRule={addSortRule} onRemoveRule={removeSortRule} onSetDirection={setRuleDirection} onMoveRule={moveSortRule} onClear={clearSort} maxRules={sortMaxRules} />
        <TableColumnPicker open={columnPickerOpen && activeTab === 'today'} reorderableRows={TOGGLEABLE_COLUMNS} columnVisibility={columnVisibility} columnOrder={columnOrder} columnDropIndicator={columnDropIndicator} onSetVisible={setColumnVisible} onDragStart={handleColumnDragStart} onDragEnd={handleColumnDragEnd} onRowDragOver={handleColumnRowDragOver} onListDragLeave={handleColumnListDragLeave} onDrop={handleColumnDrop} onReset={resetColumnTablePreferences} />
      </div>

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading attendance…</p> : null}

      <TableResultsCount count={resultCount} />

      {activeTab === 'today' && (
        <HRDataTableCard>
          <Table columns={visibleTodayColumns} data={sortedTodayRows} keyField="employeeId" variant="modernEmbedded" {...tableResizeProps} />
          {!loading && todayRows.length === 0 ? (
            <TableEmptyBelow icon={UserCheck} title="No attendance records found" description="Mark attendance or adjust filters." action={<Button className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => openMarkModal(null)}><Plus className="h-4 w-4" />Mark attendance</Button>} />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'monthly' && (
        <>
          <div className="flex justify-end">
            <Input type="month" value={monthValue} onChange={(e) => setMonthValue(e.target.value)} className="max-w-[200px]" />
          </div>
          <HRDataTableCard>
            <Table columns={monthlyColumns} data={monthlyRows} keyField="id" variant="modernEmbedded" />
            {!loading && monthlyRows.length === 0 ? (
              <TableEmptyBelow icon={FileSpreadsheet} title="No monthly records" description="Mark attendance during the month to build the log." />
            ) : null}
          </HRDataTableCard>
        </>
      )}

      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {shiftCards.map((s) => (
            <Card key={s.id} variant="elevated" className="p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{s.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{s.timing}</p>
                  <p className="mt-3 text-sm font-medium text-orange-600">{s.employees} employees assigned</p>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                  <Clock className="h-5 w-5 text-orange-600" aria-hidden />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'overtime' && (
        <HRDataTableCard>
          <Table columns={overtimeColumns} data={overtimeRows} keyField="id" variant="modernEmbedded" />
          {!loading && overtimeRows.length === 0 ? (
            <TableEmptyBelow icon={Clock} title="No overtime records" description="Overtime entries can be added via API or future UI." />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'reports' && (
        <Card variant="elevated">
          <div className="flex flex-col items-center py-10 text-center">
            <Users className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">Attendance reports</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Export today&apos;s roster ({todayRoster.length} employees) or monthly log ({monthlyRecords.length} records).
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="primary" onClick={() => exportAttendanceCsv(todayRows, { dateLabel: todayDateLabel(selectedDate) })}>
                Export today
              </Button>
              <Button variant="secondary" onClick={() => exportAttendanceCsv(monthlyRows, { dateLabel: monthValue })}>
                Export monthly
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Attendance" size="md">
        <div className="space-y-5">
          <Select label="Status" value={statusFilter} options={STATUS_OPTIONS} onChange={setStatusFilter} />
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setStatusFilter('')}>Clear</Button>
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={Boolean(deleteTarget)} onClose={() => !actionId && setDeleteTarget(null)} title="Delete attendance record" size="md">
        <p className="text-sm text-gray-600">Delete saved attendance for <strong>{deleteTarget?.name}</strong>?</p>
        <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-5">
          <Button variant="outline" disabled={Boolean(actionId)} onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button className="bg-red-600 hover:bg-red-700" disabled={Boolean(actionId)} onClick={handleDelete}>{actionId ? 'Deleting…' : 'Delete'}</Button>
        </div>
      </Modal>

      <MarkAttendanceModal
        open={markOpen}
        onClose={() => { setMarkOpen(false); setEditRow(null) }}
        employees={employees}
        selectedDate={selectedDate}
        initialRow={editRow}
        onSaved={handleSaveAttendance}
      />
    </HRModulePage>
  )
}
