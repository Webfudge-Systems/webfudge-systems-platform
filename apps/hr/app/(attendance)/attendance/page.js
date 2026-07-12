'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  UserCheck,
  UserX,
  Home,
  Clock,
  FileSpreadsheet,
  Users,
  Plus,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
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
import MarkAttendanceModal from '../../../components/attendance/MarkAttendanceModal'
import HRAttendanceHeaderPicker from '../../../components/attendance/HRAttendanceHeaderPicker'
import HRMonthlyAttendanceLog from '../../../components/attendance/HRMonthlyAttendanceLog'
import RegularizationPanel from '../../../components/attendance/RegularizationPanel'
import {
  buildTodayAttendanceColumns,
  buildMonthlyAttendanceColumns,
  buildOvertimeColumns,
  buildShiftColumns,
  resolveVisibleAttendanceColumns,
} from '../../../components/attendance/attendanceTableColumns'
import {
  filterAttendanceLog,
  filterShifts,
  filterOvertimeRecords,
  getAttendanceTabItems,
  attendanceSortValue,
  overtimeSortValue,
  shiftSortValue,
} from '../../../lib/attendancePage'
import {
  ATTENDANCE_UPDATED_EVENT,
  buildAttendanceSnapshot,
  buildDailyAttendanceRoster,
  monthRange,
  notifyAttendanceUpdated,
  todayDateLabel,
  toDateInputValue,
} from '../../../lib/attendanceShared'
import { buildShiftCardsFromEmployees, resolveAttendanceShift } from '../../../lib/shiftShared'
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
import {
  listRegularizationRequests,
  REGULARIZATION_UPDATED_EVENT,
} from '../../../lib/regularizationSyncService'
import { LEAVE_UPDATED_EVENT } from '../../../lib/leaveShared'
import { listSyncedEmployees } from '../../../lib/employeeSyncService'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'

const TABLE_SORT_STORAGE_KEY = 'hr.attendance.today.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.today.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.today.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.today.tableColumnWidths'

const MONTHLY_TABLE_SORT_STORAGE_KEY = 'hr.attendance.monthly.tableSort'
const MONTHLY_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.monthly.tableColumnVisibility'
const MONTHLY_COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.monthly.tableColumnOrder'
const MONTHLY_COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.monthly.tableColumnWidths'

const OVERTIME_TABLE_SORT_STORAGE_KEY = 'hr.attendance.overtime.tableSort'
const OVERTIME_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.overtime.tableColumnVisibility'
const OVERTIME_COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.overtime.tableColumnOrder'
const OVERTIME_COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.overtime.tableColumnWidths'

const SHIFT_TABLE_SORT_STORAGE_KEY = 'hr.attendance.shifts.tableSort'
const SHIFT_COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.shifts.tableColumnVisibility'
const SHIFT_COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.shifts.tableColumnOrder'
const SHIFT_COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.shifts.tableColumnWidths'

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

const MONTHLY_DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  date: 130,
  clockIn: 100,
  clockOut: 100,
  duration: 110,
  status: 130,
  location: 160,
  actions: 140,
}

const OVERTIME_DEFAULT_COLUMN_WIDTHS = {
  employee: 260,
  date: 130,
  ot: 100,
  amount: 120,
  status: 150,
  actions: 140,
}

const SHIFT_DEFAULT_COLUMN_WIDTHS = {
  shift: 260,
  timing: 160,
  employees: 140,
  status: 130,
}

const MIN_COLUMN_WIDTHS = { actions: 120 }

const TOGGLEABLE_COLUMNS = [
  { key: 'clockIn', label: 'Clock in' },
  { key: 'clockOut', label: 'Clock out' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
]

const MONTHLY_TOGGLEABLE_COLUMNS = [
  { key: 'date', label: 'Date' },
  ...TOGGLEABLE_COLUMNS,
]

const OVERTIME_TOGGLEABLE_COLUMNS = [
  { key: 'date', label: 'Date' },
  { key: 'ot', label: 'OT hours' },
  { key: 'amount', label: 'Amount' },
  { key: 'status', label: 'Status' },
]

const SHIFT_TOGGLEABLE_COLUMNS = [
  { key: 'timing', label: 'Timing' },
  { key: 'employees', label: 'Assigned' },
  { key: 'status', label: 'Status' },
]

const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const MONTHLY_DEFAULT_COLUMN_VISIBILITY = MONTHLY_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)
const OVERTIME_DEFAULT_COLUMN_VISIBILITY = OVERTIME_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)
const SHIFT_DEFAULT_COLUMN_VISIBILITY = SHIFT_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)

const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const MONTHLY_SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...MONTHLY_TOGGLEABLE_COLUMNS]
const OVERTIME_SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...OVERTIME_TOGGLEABLE_COLUMNS]
const SHIFT_SORT_COLUMN_OPTIONS = [{ key: 'shift', label: 'Shift' }, ...SHIFT_TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)
const MONTHLY_SORTABLE_KEYS = MONTHLY_SORT_COLUMN_OPTIONS.map((c) => c.key)
const OVERTIME_SORTABLE_KEYS = OVERTIME_SORT_COLUMN_OPTIONS.map((c) => c.key)
const SHIFT_SORTABLE_KEYS = SHIFT_SORT_COLUMN_OPTIONS.map((c) => c.key)

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
  const [regularizationPendingCount, setRegularizationPendingCount] = useState(0)
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

      const [{ employees: employeeRows }, dayRecords, monthRows, leaves, overtime, regularizations] = await Promise.all([
        listSyncedEmployees(),
        listAttendanceRecords({ date: selectedDate }),
        listAttendanceRecords({ from, to }),
        listLeaveRequests(),
        listOvertimeRecords(),
        listRegularizationRequests({ status: 'pending', limit: 100 }),
      ])

      setEmployees(employeeRows || [])
      setSavedRecords(dayRecords || [])
      setMonthlyRecords(monthRows || [])
      setLeaveRequests(leaves || [])
      setOvertimeRecords(overtime || [])
      setRegularizationPendingCount(regularizations?.length || 0)
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
    window.addEventListener(REGULARIZATION_UPDATED_EVENT, onUpdated)
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, onUpdated)
      window.removeEventListener(LEAVE_UPDATED_EVENT, onUpdated)
      window.removeEventListener(REGULARIZATION_UPDATED_EVENT, onUpdated)
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

  const shiftCards = useMemo(() => buildShiftCardsFromEmployees(employees), [employees])

  const shiftRows = useMemo(
    () => filterShifts(shiftCards, searchQuery),
    [shiftCards, searchQuery],
  )

  const tabItems = useMemo(
    () =>
      getAttendanceTabItems({
        todayCount: todayRoster.length,
        monthlyCount: monthlyRecords.length,
        shiftsCount: shiftCards.length,
        overtimeCount: overtimeRecords.length,
        regularizationCount: regularizationPendingCount,
      }),
    [todayRoster.length, monthlyRecords.length, shiftCards.length, overtimeRecords.length, regularizationPendingCount],
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
    columnVisibility: monthlyColumnVisibility,
    columnOrder: monthlyColumnOrder,
    columnPickerOpen: monthlyColumnPickerOpen,
    setColumnPickerOpen: setMonthlyColumnPickerOpen,
    columnDropIndicator: monthlyColumnDropIndicator,
    setColumnVisible: setMonthlyColumnVisible,
    handleColumnDragStart: handleMonthlyColumnDragStart,
    handleColumnDragEnd: handleMonthlyColumnDragEnd,
    handleColumnRowDragOver: handleMonthlyColumnRowDragOver,
    handleColumnListDragLeave: handleMonthlyColumnListDragLeave,
    handleColumnDrop: handleMonthlyColumnDrop,
    resetColumnTablePreferences: resetMonthlyColumnTablePreferences,
    tableResizeProps: monthlyTableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: MONTHLY_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: MONTHLY_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: MONTHLY_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: MONTHLY_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: MONTHLY_TOGGLEABLE_COLUMNS.map((c) => c.key),
    defaultWidths: MONTHLY_DEFAULT_COLUMN_WIDTHS,
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

  const {
    sortRules: monthlySortRules,
    sortData: monthlySortData,
    bindSortableColumns: bindMonthlySortableColumns,
    hasActiveSort: hasMonthlyActiveSort,
    addSortRule: addMonthlySortRule,
    removeSortRule: removeMonthlySortRule,
    setRuleDirection: setMonthlyRuleDirection,
    moveSortRule: moveMonthlySortRule,
    clearSort: clearMonthlySort,
    maxRules: monthlySortMaxRules,
  } = useTableSort({ storageKey: MONTHLY_TABLE_SORT_STORAGE_KEY })

  const {
    columnVisibility: overtimeColumnVisibility,
    columnOrder: overtimeColumnOrder,
    columnPickerOpen: overtimeColumnPickerOpen,
    setColumnPickerOpen: setOvertimeColumnPickerOpen,
    columnDropIndicator: overtimeColumnDropIndicator,
    setColumnVisible: setOvertimeColumnVisible,
    handleColumnDragStart: handleOvertimeColumnDragStart,
    handleColumnDragEnd: handleOvertimeColumnDragEnd,
    handleColumnRowDragOver: handleOvertimeColumnRowDragOver,
    handleColumnListDragLeave: handleOvertimeColumnListDragLeave,
    handleColumnDrop: handleOvertimeColumnDrop,
    resetColumnTablePreferences: resetOvertimeColumnTablePreferences,
    tableResizeProps: overtimeTableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: OVERTIME_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: OVERTIME_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: OVERTIME_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: OVERTIME_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: OVERTIME_TOGGLEABLE_COLUMNS.map((c) => c.key),
    defaultWidths: OVERTIME_DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    sortRules: overtimeSortRules,
    sortData: overtimeSortData,
    bindSortableColumns: bindOvertimeSortableColumns,
    hasActiveSort: hasOvertimeActiveSort,
    addSortRule: addOvertimeSortRule,
    removeSortRule: removeOvertimeSortRule,
    setRuleDirection: setOvertimeRuleDirection,
    moveSortRule: moveOvertimeSortRule,
    clearSort: clearOvertimeSort,
    maxRules: overtimeSortMaxRules,
  } = useTableSort({ storageKey: OVERTIME_TABLE_SORT_STORAGE_KEY })

  const {
    columnVisibility: shiftColumnVisibility,
    columnOrder: shiftColumnOrder,
    columnPickerOpen: shiftColumnPickerOpen,
    setColumnPickerOpen: setShiftColumnPickerOpen,
    columnDropIndicator: shiftColumnDropIndicator,
    setColumnVisible: setShiftColumnVisible,
    handleColumnDragStart: handleShiftColumnDragStart,
    handleColumnDragEnd: handleShiftColumnDragEnd,
    handleColumnRowDragOver: handleShiftColumnRowDragOver,
    handleColumnListDragLeave: handleShiftColumnListDragLeave,
    handleColumnDrop: handleShiftColumnDrop,
    resetColumnTablePreferences: resetShiftColumnTablePreferences,
    tableResizeProps: shiftTableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: SHIFT_COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: SHIFT_COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: SHIFT_COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: SHIFT_DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: SHIFT_TOGGLEABLE_COLUMNS.map((c) => c.key),
    defaultWidths: SHIFT_DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const {
    sortRules: shiftSortRules,
    sortData: shiftSortData,
    bindSortableColumns: bindShiftSortableColumns,
    hasActiveSort: hasShiftActiveSort,
    addSortRule: addShiftSortRule,
    removeSortRule: removeShiftSortRule,
    setRuleDirection: setShiftRuleDirection,
    moveSortRule: moveShiftSortRule,
    clearSort: clearShiftSort,
    maxRules: shiftSortMaxRules,
  } = useTableSort({ storageKey: SHIFT_TABLE_SORT_STORAGE_KEY })

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

  const sortedMonthlyRows = useMemo(
    () => monthlySortData(monthlyRows, (row, key) => attendanceSortValue(row, key)),
    [monthlyRows, monthlySortData, monthlySortRules],
  )

  const overtimeRows = useMemo(() => {
    const filtered = filterOvertimeRecords(overtimeRecords, searchQuery)
    return filtered.map((row) => {
      const employee = employees.find(
        (item) => String(item.membershipId || item.id) === String(row.organizationUserId),
      )
      return {
        ...row,
        name: row.employee,
        employeeCode: employee?.employeeId,
      }
    })
  }, [overtimeRecords, searchQuery, employees])

  const sortedOvertimeRows = useMemo(
    () => overtimeSortData(overtimeRows, (row, key) => overtimeSortValue(row, key)),
    [overtimeRows, overtimeSortData, overtimeSortRules],
  )

  const sortedShiftRows = useMemo(
    () => shiftSortData(shiftRows, (row, key) => shiftSortValue(row, key)),
    [shiftRows, shiftSortData, shiftSortRules],
  )

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
          workShift: payload.workShift,
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
      const employee = employees.find(
        (item) => String(item.membershipId || item.id) === String(orgUserId),
      )
      try {
        setActionId(rowKey)
        setActionError('')
        const workShift = resolveAttendanceShift(employee, row.workShift)
        const payload = {
          attendanceDate: row.attendanceDate || selectedDate,
          status,
          workShift,
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
    [employees, selectedDate, loadData],
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

  const attendanceLogHandlers = useMemo(
    () => ({
      actionId,
      onQuickMark: handleQuickMark,
      onOpenMarkModal: openMarkModal,
      onDelete: setDeleteTarget,
    }),
    [actionId, openMarkModal, handleQuickMark],
  )

  const todayTableColumns = useMemo(
    () => buildTodayAttendanceColumns(attendanceLogHandlers),
    [attendanceLogHandlers],
  )

  const monthlyColumns = useMemo(
    () => buildMonthlyAttendanceColumns(attendanceLogHandlers),
    [attendanceLogHandlers],
  )

  const overtimeColumns = useMemo(
    () =>
      buildOvertimeColumns({
        actionId,
        onApprove: handleApproveOvertime,
        onDelete: async (id) => {
          setActionId(id)
          await deleteOvertimeRecord(id)
          await loadData()
          setActionId(null)
        },
      }),
    [actionId, handleApproveOvertime, loadData],
  )

  const shiftColumns = useMemo(() => buildShiftColumns(), [])

  const visibleTodayColumns = useMemo(
    () =>
      resolveVisibleAttendanceColumns(
        todayTableColumns,
        columnOrder,
        columnVisibility,
        bindSortableColumns,
        SORTABLE_KEYS,
      ),
    [columnOrder, columnVisibility, todayTableColumns, bindSortableColumns],
  )

  const visibleMonthlyColumns = useMemo(
    () =>
      resolveVisibleAttendanceColumns(
        monthlyColumns,
        monthlyColumnOrder,
        monthlyColumnVisibility,
        bindMonthlySortableColumns,
        MONTHLY_SORTABLE_KEYS,
      ),
    [monthlyColumnOrder, monthlyColumnVisibility, monthlyColumns, bindMonthlySortableColumns],
  )

  const visibleOvertimeColumns = useMemo(
    () =>
      resolveVisibleAttendanceColumns(
        overtimeColumns,
        overtimeColumnOrder,
        overtimeColumnVisibility,
        bindOvertimeSortableColumns,
        OVERTIME_SORTABLE_KEYS,
      ),
    [overtimeColumnOrder, overtimeColumnVisibility, overtimeColumns, bindOvertimeSortableColumns],
  )

  const visibleShiftColumns = useMemo(
    () =>
      resolveVisibleAttendanceColumns(
        shiftColumns,
        shiftColumnOrder,
        shiftColumnVisibility,
        bindShiftSortableColumns,
        SHIFT_SORTABLE_KEYS,
        'shift',
      ),
    [shiftColumnOrder, shiftColumnVisibility, shiftColumns, bindShiftSortableColumns],
  )

  const activeTableContext = useMemo(() => {
    if (activeTab === 'shifts') {
      return {
        sortRules: shiftSortRules,
        sortColumnOptions: SHIFT_SORT_COLUMN_OPTIONS,
        hasActiveSort: hasShiftActiveSort,
        reorderableColumns: SHIFT_TOGGLEABLE_COLUMNS,
        columnVisibility: shiftColumnVisibility,
        columnOrder: shiftColumnOrder,
        columnDropIndicator: shiftColumnDropIndicator,
        setColumnVisible: setShiftColumnVisible,
        handleColumnDragStart: handleShiftColumnDragStart,
        handleColumnDragEnd: handleShiftColumnDragEnd,
        handleColumnRowDragOver: handleShiftColumnRowDragOver,
        handleColumnListDragLeave: handleShiftColumnListDragLeave,
        handleColumnDrop: handleShiftColumnDrop,
        resetColumnTablePreferences: resetShiftColumnTablePreferences,
        addSortRule: addShiftSortRule,
        removeSortRule: removeShiftSortRule,
        setRuleDirection: setShiftRuleDirection,
        moveSortRule: moveShiftSortRule,
        clearSort: clearShiftSort,
        sortMaxRules: shiftSortMaxRules,
        columnPickerOpen: shiftColumnPickerOpen,
        setColumnPickerOpen: setShiftColumnPickerOpen,
      }
    }

    if (activeTab === 'monthly') {
      return {
        sortRules: monthlySortRules,
        sortColumnOptions: MONTHLY_SORT_COLUMN_OPTIONS,
        hasActiveSort: hasMonthlyActiveSort,
        reorderableColumns: MONTHLY_TOGGLEABLE_COLUMNS,
        columnVisibility: monthlyColumnVisibility,
        columnOrder: monthlyColumnOrder,
        columnDropIndicator: monthlyColumnDropIndicator,
        setColumnVisible: setMonthlyColumnVisible,
        handleColumnDragStart: handleMonthlyColumnDragStart,
        handleColumnDragEnd: handleMonthlyColumnDragEnd,
        handleColumnRowDragOver: handleMonthlyColumnRowDragOver,
        handleColumnListDragLeave: handleMonthlyColumnListDragLeave,
        handleColumnDrop: handleMonthlyColumnDrop,
        resetColumnTablePreferences: resetMonthlyColumnTablePreferences,
        addSortRule: addMonthlySortRule,
        removeSortRule: removeMonthlySortRule,
        setRuleDirection: setMonthlyRuleDirection,
        moveSortRule: moveMonthlySortRule,
        clearSort: clearMonthlySort,
        sortMaxRules: monthlySortMaxRules,
        columnPickerOpen: monthlyColumnPickerOpen,
        setColumnPickerOpen: setMonthlyColumnPickerOpen,
      }
    }

    if (activeTab === 'overtime') {
      return {
        sortRules: overtimeSortRules,
        sortColumnOptions: OVERTIME_SORT_COLUMN_OPTIONS,
        hasActiveSort: hasOvertimeActiveSort,
        reorderableColumns: OVERTIME_TOGGLEABLE_COLUMNS,
        columnVisibility: overtimeColumnVisibility,
        columnOrder: overtimeColumnOrder,
        columnDropIndicator: overtimeColumnDropIndicator,
        setColumnVisible: setOvertimeColumnVisible,
        handleColumnDragStart: handleOvertimeColumnDragStart,
        handleColumnDragEnd: handleOvertimeColumnDragEnd,
        handleColumnRowDragOver: handleOvertimeColumnRowDragOver,
        handleColumnListDragLeave: handleOvertimeColumnListDragLeave,
        handleColumnDrop: handleOvertimeColumnDrop,
        resetColumnTablePreferences: resetOvertimeColumnTablePreferences,
        addSortRule: addOvertimeSortRule,
        removeSortRule: removeOvertimeSortRule,
        setRuleDirection: setOvertimeRuleDirection,
        moveSortRule: moveOvertimeSortRule,
        clearSort: clearOvertimeSort,
        sortMaxRules: overtimeSortMaxRules,
        columnPickerOpen: overtimeColumnPickerOpen,
        setColumnPickerOpen: setOvertimeColumnPickerOpen,
      }
    }

    if (activeTab === 'today') {
      return {
        sortRules,
        sortColumnOptions: SORT_COLUMN_OPTIONS,
        hasActiveSort,
        reorderableColumns: TOGGLEABLE_COLUMNS,
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
      }
    }

    return null
  }, [
    activeTab,
    shiftSortRules,
    hasShiftActiveSort,
    shiftColumnVisibility,
    shiftColumnOrder,
    shiftColumnDropIndicator,
    shiftColumnPickerOpen,
    setShiftColumnVisible,
    handleShiftColumnDragStart,
    handleShiftColumnDragEnd,
    handleShiftColumnRowDragOver,
    handleShiftColumnListDragLeave,
    handleShiftColumnDrop,
    resetShiftColumnTablePreferences,
    addShiftSortRule,
    removeShiftSortRule,
    setShiftRuleDirection,
    moveShiftSortRule,
    clearShiftSort,
    shiftSortMaxRules,
    setShiftColumnPickerOpen,
    monthlySortRules,
    hasMonthlyActiveSort,
    monthlyColumnVisibility,
    monthlyColumnOrder,
    monthlyColumnDropIndicator,
    monthlyColumnPickerOpen,
    overtimeSortRules,
    hasOvertimeActiveSort,
    overtimeColumnVisibility,
    overtimeColumnOrder,
    overtimeColumnDropIndicator,
    overtimeColumnPickerOpen,
    sortRules,
    hasActiveSort,
    columnVisibility,
    columnOrder,
    columnDropIndicator,
    columnPickerOpen,
    setMonthlyColumnVisible,
    handleMonthlyColumnDragStart,
    handleMonthlyColumnDragEnd,
    handleMonthlyColumnRowDragOver,
    handleMonthlyColumnListDragLeave,
    handleMonthlyColumnDrop,
    resetMonthlyColumnTablePreferences,
    addMonthlySortRule,
    removeMonthlySortRule,
    setMonthlyRuleDirection,
    moveMonthlySortRule,
    clearMonthlySort,
    monthlySortMaxRules,
    setMonthlyColumnPickerOpen,
    setOvertimeColumnVisible,
    handleOvertimeColumnDragStart,
    handleOvertimeColumnDragEnd,
    handleOvertimeColumnRowDragOver,
    handleOvertimeColumnListDragLeave,
    handleOvertimeColumnDrop,
    resetOvertimeColumnTablePreferences,
    addOvertimeSortRule,
    removeOvertimeSortRule,
    setOvertimeRuleDirection,
    moveOvertimeSortRule,
    clearOvertimeSort,
    overtimeSortMaxRules,
    setOvertimeColumnPickerOpen,
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
    setColumnPickerOpen,
  ])

  useEffect(() => {
    setSortPickerOpen(false)
  }, [activeTab])

  useEffect(() => {
    if (!sortPickerOpen) return undefined
    const onDocMouseDown = (event) => {
      if (toolbarRef.current?.contains(event.target)) return
      setSortPickerOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [sortPickerOpen, toolbarRef])

  const isDataTableTab = Boolean(activeTableContext)

  const markModalDate = useMemo(() => {
    if (activeTab !== 'monthly') return selectedDate
    const today = toDateInputValue()
    return today.startsWith(monthValue) ? today : `${monthValue}-01`
  }, [activeTab, selectedDate, monthValue])

  const resultCount =
    activeTab === 'today'
      ? todayRows.length
      : activeTab === 'monthly'
        ? monthlyRows.length
        : activeTab === 'overtime'
          ? overtimeRows.length
          : activeTab === 'shifts'
            ? shiftRows.length
            : activeTab === 'regularization'
              ? regularizationPendingCount
              : 0

  const showResultsCount = ['today', 'shifts', 'overtime', 'regularization'].includes(activeTab)

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Attendance"
        subtitle="Track daily attendance, shifts, overtime, and workforce presence across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Attendance', href: '/attendance' }]}
        showProfile
        actions={
          activeTab === 'today' ? (
            <HRAttendanceHeaderPicker
              mode="date"
              value={selectedDate}
              onChange={setSelectedDate}
            />
          ) : activeTab === 'monthly' ? (
            <HRAttendanceHeaderPicker
              mode="month"
              value={monthValue}
              onChange={setMonthValue}
            />
          ) : null
        }
      />

      <HRKpiRow columns={4}>
        <KPICard title="Present" value={snapshot.present} subtitle={`${snapshot.present} employees`} icon={UserCheck} colorScheme="orange" />
        <KPICard title="On Leave" value={snapshot.onLeave} subtitle={`${snapshot.onLeave} on leave`} icon={Clock} colorScheme="orange" />
        <KPICard title="Absent" value={snapshot.absent} subtitle={`${snapshot.absent} marked absent`} icon={UserX} colorScheme="orange" />
        <KPICard title="WFH" value={snapshot.wfh} subtitle={`${snapshot.wfh} remote`} icon={Home} colorScheme="orange" />
      </HRKpiRow>

      <TabsWithActions
        tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="pill"
      />

      {isDataTableTab && activeTableContext ? (
        <div className="relative ml-auto w-fit max-w-full" ref={toolbarRef}>
          <TabsWithActions
            showTabs={false}
            activeTab={activeTab}
            showSearch
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search attendance..."
            showSort
            onSortClick={() => {
              activeTableContext.setColumnPickerOpen?.(false)
              setSortPickerOpen((open) => !open)
            }}
            hasActiveSort={activeTableContext.hasActiveSort}
            sortTitle="Sort"
            variant="glass"
          />
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
        </div>
      ) : null}

      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {loading ? <p className="text-sm text-gray-500">Loading attendance…</p> : null}

      {showResultsCount ? <TableResultsCount count={resultCount} /> : null}

      {activeTab === 'today' && (
        <HRDataTableCard>
          <Table columns={visibleTodayColumns} data={sortedTodayRows} keyField="employeeId" variant="modernEmbedded" {...tableResizeProps} />
          {!loading && todayRows.length === 0 ? (
            <TableEmptyBelow icon={UserCheck} title="No attendance records found" description="Mark attendance or adjust filters." action={<Button className="gap-2 bg-orange-500 hover:bg-orange-600" onClick={() => openMarkModal(null)}><Plus className="h-4 w-4" />Mark attendance</Button>} />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'monthly' && (
        <HRMonthlyAttendanceLog
          records={sortedMonthlyRows}
          monthValue={monthValue}
          loading={loading}
          actionId={actionId}
          onMarkAttendance={() => openMarkModal(null)}
          onEditRecord={openMarkModal}
          onDeleteRecord={setDeleteTarget}
        />
      )}

      {activeTab === 'shifts' && (
        <HRDataTableCard>
          <Table
            columns={visibleShiftColumns}
            data={sortedShiftRows}
            keyField="id"
            variant="modernEmbedded"
            {...shiftTableResizeProps}
          />
          {!loading && shiftRows.length === 0 ? (
            <TableEmptyBelow
              icon={Clock}
              title="No shifts found"
              description="Adjust your search to find a shift."
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'overtime' && (
        <HRDataTableCard>
          <Table
            columns={visibleOvertimeColumns}
            data={sortedOvertimeRows}
            keyField="id"
            variant="modernEmbedded"
            {...overtimeTableResizeProps}
          />
          {!loading && overtimeRows.length === 0 ? (
            <TableEmptyBelow
              icon={Clock}
              title="No overtime records"
              description="Overtime is calculated automatically when clock-out is later than shift end. Approve entries here, then recalculate payroll to include them in salary."
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'regularization' && (
        <RegularizationPanel onPendingCountChange={setRegularizationPendingCount} />
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
        selectedDate={markModalDate}
        initialRow={editRow}
        onSaved={handleSaveAttendance}
      />
    </HRModulePage>
  )
}
