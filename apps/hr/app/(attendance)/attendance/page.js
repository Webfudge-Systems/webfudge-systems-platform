'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  UserX,
  Home,
  Clock,
  FileSpreadsheet,
  Users,
  Eye,
  Trash2,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Select,
  TableCellCreated,
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
  AttendanceEmployeeCell,
  AttendanceTextCell,
  AttendanceStatusPill,
  AttendanceLocationCell,
  AttendancePersonCell,
} from '../../../components/attendance/AttendanceTableCells'
import { EMPLOYEES } from '../../../lib/mock-data/employees'
import { ATTENDANCE_LOG, SHIFTS, OVERTIME_RECORDS } from '../../../lib/mock-data/attendance'
import { buildAttendanceSnapshot } from '../../../lib/attendanceSnapshot'
import {
  filterAttendanceLog,
  filterOvertimeRecords,
  getAttendanceTabItems,
} from '../../../lib/attendancePage'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'

const TABLE_SORT_STORAGE_KEY = 'hr.attendance.today.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.attendance.today.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.attendance.today.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.attendance.today.tableColumnWidths'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'Present', label: 'Present' },
  { value: 'On Leave', label: 'On Leave' },
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
  actions: 120,
}

const MIN_COLUMN_WIDTHS = {
  actions: 120,
}

const TOGGLEABLE_COLUMNS = [
  { key: 'clockIn', label: 'Clock in' },
  { key: 'clockOut', label: 'Clock out' },
  { key: 'duration', label: 'Duration' },
  { key: 'status', label: 'Status' },
  { key: 'location', label: 'Location' },
]

const DEFAULT_ON_COLUMN_KEYS = new Set(['clockIn', 'clockOut', 'duration', 'status', 'location'])
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

function getAttendanceSortValue(row, key) {
  switch (key) {
    case 'employee':
      return row.name || ''
    case 'clockIn':
      return row.clockIn || ''
    case 'clockOut':
      return row.clockOut || ''
    case 'duration':
      return row.duration || ''
    case 'status':
      return row.status || ''
    case 'location':
      return row.location || ''
    default:
      return row[key]
  }
}

export default function AttendancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)

  const activeRoster = useMemo(
    () => EMPLOYEES.filter((e) => e.status !== 'Exited').length,
    []
  )
  const snapshot = useMemo(() => buildAttendanceSnapshot(activeRoster), [activeRoster])
  const tabItems = useMemo(() => getAttendanceTabItems(), [])

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

  const todayRows = useMemo(
    () => filterAttendanceLog(ATTENDANCE_LOG, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const sortedTodayRows = useMemo(
    () => sortData(todayRows, (row, key) => getAttendanceSortValue(row, key)),
    [todayRows, sortData, sortRules]
  )

  const overtimeRows = useMemo(
    () =>
      filterOvertimeRecords(OVERTIME_RECORDS, searchQuery).map((row, index) => ({
        ...row,
        id: `ot-${index}-${row.date}`,
      })),
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

  const todayTableColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <AttendanceEmployeeCell row={row} />,
      },
      {
        key: 'clockIn',
        visibilityKey: 'clockIn',
        label: 'IN',
        render: (_, row) => <AttendanceTextCell value={row.clockIn} emphasized />,
      },
      {
        key: 'clockOut',
        visibilityKey: 'clockOut',
        label: 'OUT',
        render: (_, row) => <AttendanceTextCell value={row.clockOut} />,
      },
      {
        key: 'duration',
        visibilityKey: 'duration',
        label: 'DURATION',
        render: (_, row) => <AttendanceTextCell value={row.duration} />,
      },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => <AttendanceStatusPill status={row.status} />,
      },
      {
        key: 'location',
        visibilityKey: 'location',
        label: 'LOCATION',
        render: (_, row) => <AttendanceLocationCell location={row.location} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        resizable: false,
        width: 120,
        defaultWidth: '120px',
        headerClassName: 'whitespace-nowrap text-right',
        className: 'whitespace-nowrap text-right align-middle',
        render: (_, row) => (
          <div
            className="flex min-w-[100px] shrink-0 items-center justify-end gap-0.5"
            onClick={(event) => event.stopPropagation()}
          >
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
              title="Delete record"
              onClick={(event) => {
                event.stopPropagation()
                console.log('Delete attendance record', row.employeeId)
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

  const visibleTodayColumns = useMemo(() => {
    const byKey = Object.fromEntries(todayTableColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey) continue
      if (!columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return activeTab === 'today' ? bindSortableColumns(out, SORTABLE_KEYS) : out
  }, [columnOrder, columnVisibility, todayTableColumns, activeTab, bindSortableColumns])

  const overtimeColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => <AttendancePersonCell name={row.employee} />,
      },
      {
        key: 'date',
        label: 'DATE',
        render: (_, row) => <TableCellCreated dateString={row.date} dateMode="calendar" />,
      },
      {
        key: 'ot',
        label: 'OT HRS',
        render: (_, row) => <AttendanceTextCell value={String(row.ot)} emphasized />,
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <AttendanceTextCell value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <AttendanceStatusPill status={row.status} />,
      },
    ],
    []
  )

  const showTableToolbar = activeTab === 'today'

  const resultCount =
    activeTab === 'today'
      ? todayRows.length
      : activeTab === 'overtime'
        ? overtimeRows.length
        : activeTab === 'shifts'
          ? SHIFTS.length
          : 0

  const emptyToday = {
    icon: UserCheck,
    title: 'No attendance records found',
    description: 'Try adjusting your search or status filter.',
    action: null,
  }

  const emptyOvertime = {
    icon: Clock,
    title: 'No overtime records found',
    description: 'Try adjusting your search.',
    action: null,
  }

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Attendance"
        subtitle="Track daily attendance, shifts, overtime, and workforce presence across your organization"
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Attendance', href: '/attendance' }]}
        showProfile
        showActions
        onImportClick={() => console.log('Import attendance')}
        onExportClick={() => console.log('Export attendance')}
      />

      <HRKpiRow>
        <KPICard
          title="Present"
          value={snapshot.present}
          subtitle={
            snapshot.present === 0
              ? 'No employees'
              : snapshot.present === 1
                ? '1 employee'
                : `${snapshot.present} employees`
          }
          icon={UserCheck}
          colorScheme="orange"
        />
        <KPICard
          title="On Leave"
          value={snapshot.onLeave}
          subtitle={
            snapshot.onLeave === 0
              ? 'None on leave'
              : snapshot.onLeave === 1
                ? '1 on leave'
                : `${snapshot.onLeave} on leave`
          }
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Absent"
          value={snapshot.absent}
          subtitle={
            snapshot.absent === 0
              ? 'No absences'
              : snapshot.absent === 1
                ? '1 absent'
                : `${snapshot.absent} absent`
          }
          icon={UserX}
          colorScheme="orange"
        />
        <KPICard
          title="WFH"
          value={snapshot.wfh}
          subtitle={
            snapshot.wfh === 0
              ? 'None remote'
              : snapshot.wfh === 1
                ? '1 remote'
                : `${snapshot.wfh} working remotely`
          }
          icon={Home}
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
          searchPlaceholder="Search attendance..."
          showFilter
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(statusFilter)}
          filterTitle={statusFilter ? 'Status filter active' : 'Filter attendance'}
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
          sortTitle="Sort attendance (Shift+click headers for multi-sort)"
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

      {activeTab === 'today' && (
        <HRDataTableCard>
          <Table
            columns={visibleTodayColumns}
            data={sortedTodayRows}
            keyField="employeeId"
            variant="modernEmbedded"
            {...tableResizeProps}
            onRowClick={(row) => router.push(`/employees/${row.employeeId}`)}
          />
          {todayRows.length === 0 ? (
            <TableEmptyBelow
              icon={emptyToday.icon}
              title={emptyToday.title}
              description={emptyToday.description}
              action={emptyToday.action}
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'monthly' && (
        <Card variant="elevated">
          <div className="flex flex-col items-center py-10 text-center">
            <FileSpreadsheet className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">Monthly attendance log</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Calendar grid by employee and department — connect payroll period to enable this view.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => console.log('Open monthly grid')}>
              Open monthly grid
            </Button>
          </div>
        </Card>
      )}

      {activeTab === 'shifts' && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SHIFTS.map((s) => (
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
          {overtimeRows.length === 0 ? (
            <TableEmptyBelow
              icon={emptyOvertime.icon}
              title={emptyOvertime.title}
              description={emptyOvertime.description}
              action={emptyOvertime.action}
            />
          ) : null}
        </HRDataTableCard>
      )}

      {activeTab === 'reports' && (
        <Card variant="elevated">
          <div className="flex flex-col items-center py-10 text-center">
            <Users className="mb-3 h-12 w-12 text-gray-300" />
            <h3 className="text-lg font-semibold text-gray-800">Attendance reports</h3>
            <p className="mt-2 max-w-md text-sm text-gray-500">
              Export daily, monthly, and shift-wise attendance summaries for payroll and compliance.
            </p>
            <Button variant="primary" className="mt-6" onClick={() => console.log('Export reports')}>
              Export report
            </Button>
          </div>
        </Card>
      )}

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Attendance" size="md">
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
