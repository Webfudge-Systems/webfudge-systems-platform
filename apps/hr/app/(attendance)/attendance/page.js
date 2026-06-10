'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  UserCheck,
  UserX,
  Home,
  Clock,
  CalendarClock,
  MapPin,
  FileSpreadsheet,
  Users,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  Card,
  TableResultsCount,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRSectionCard from '../../../components/shared/HRSectionCard'
import HRDataTableCard from '../../../components/shared/HRDataTableCard'
import HRTableRowActions from '../../../components/shared/HRTableRowActions'
import HRStatusBadge from '../../../components/shared/HRStatusBadge'
import { EMPLOYEES } from '../../../lib/mock-data/employees'
import { ATTENDANCE_LOG, SHIFTS, OVERTIME_RECORDS } from '../../../lib/mock-data/attendance'
import { buildAttendanceSnapshot } from '../../../lib/attendanceSnapshot'
import {
  filterAttendanceLog,
  filterOvertimeRecords,
  getAttendanceTabItems,
  todayDateLabel,
} from '../../../lib/attendancePage'

const STATUS_FILTERS = ['', 'Present', 'On Leave', 'WFH', 'Absent']

export default function AttendancePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('today')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const activeRoster = useMemo(
    () => EMPLOYEES.filter((e) => e.status !== 'Exited').length,
    []
  )
  const snapshot = useMemo(() => buildAttendanceSnapshot(activeRoster), [activeRoster])
  const tabItems = useMemo(() => getAttendanceTabItems(), [])

  const todayRows = useMemo(
    () => filterAttendanceLog(ATTENDANCE_LOG, { search: searchQuery, statusFilter }),
    [searchQuery, statusFilter]
  )

  const overtimeRows = useMemo(
    () =>
      filterOvertimeRecords(OVERTIME_RECORDS, searchQuery).map((row, index) => ({
        ...row,
        id: `ot-${index}-${row.date}`,
      })),
    [searchQuery]
  )

  const todayColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[200px] items-center gap-3">
            <Avatar alt={row.name} fallback={row.name?.charAt(0) || '?'} size="sm" className="flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate font-medium text-gray-900">{row.name}</span>
                {row.late ? (
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                    Late
                  </span>
                ) : null}
              </div>
              <div className="truncate text-sm text-gray-500">{row.employeeId}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'clockIn',
        label: 'IN',
        render: (_, row) => <TableCellText value={row.clockIn} emphasized />,
      },
      {
        key: 'clockOut',
        label: 'OUT',
        render: (_, row) => <TableCellText value={row.clockOut} />,
      },
      {
        key: 'duration',
        label: 'DURATION',
        render: (_, row) => <TableCellText value={row.duration} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'location',
        label: 'LOCATION',
        render: (_, row) => (
          <div className="flex min-w-[120px] items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 shrink-0 text-gray-400" aria-hidden />
            <span className="truncate">{row.location || '—'}</span>
          </div>
        ),
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <HRTableRowActions
            onEdit={() => router.push(`/employees/${row.employeeId}`)}
            editTitle="View employee"
            onDelete={() => console.log('Delete attendance record', row.id)}
            deleteTitle="Delete record"
            itemName={row.employee}
          />
        ),
      },
    ],
    [router]
  )

  const overtimeColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        render: (_, row) => <TableCellText value={row.employee} emphasized />,
      },
      {
        key: 'date',
        label: 'DATE',
        render: (_, row) => <TableCellText value={row.date} />,
      },
      {
        key: 'ot',
        label: 'OT HRS',
        render: (_, row) => <TableCellText value={String(row.ot)} />,
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => <TableCellText value={`₹${row.amount.toLocaleString('en-IN')}`} emphasized />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'today'
      ? todayRows.length
      : activeTab === 'overtime'
        ? overtimeRows.length
        : activeTab === 'shifts'
          ? SHIFTS.length
          : 0

  return (
    <HRModulePage>
      <HRPageHeader
        title="Attendance"
        subtitle={`Today: ${todayDateLabel()} · ${snapshot.markedPct}% marked in`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Attendance', href: '/attendance' },
        ]}
        showActions
        showSearch
        onImportClick={() => console.log('Import attendance')}
        onExportClick={() => console.log('Export attendance')}
      />

      <HRKpiRow columns={5}>
        <KPICard
          title="Present"
          value={snapshot.present}
          subtitle={snapshot.present === 1 ? '1 employee' : `${snapshot.present} employees`}
          icon={UserCheck}
          colorScheme="orange"
        />
        <KPICard
          title="On Leave"
          value={snapshot.onLeave}
          subtitle={snapshot.onLeave === 0 ? 'None on leave' : `${snapshot.onLeave} on leave`}
          icon={Clock}
          colorScheme="orange"
        />
        <KPICard
          title="Absent"
          value={snapshot.absent}
          subtitle={snapshot.absent === 0 ? 'No absences' : `${snapshot.absent} absent`}
          icon={UserX}
          colorScheme="orange"
        />
        <KPICard
          title="WFH"
          value={snapshot.wfh}
          subtitle={snapshot.wfh === 0 ? 'None remote' : `${snapshot.wfh} working remotely`}
          icon={Home}
          colorScheme="orange"
        />
        <KPICard
          title="Not Marked"
          value={snapshot.notMarked}
          subtitle={snapshot.notMarked === 0 ? 'All marked' : `${snapshot.notMarked} pending`}
          icon={CalendarClock}
          colorScheme="orange"
        />
      </HRKpiRow>

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
        showFilter
        onFilterClick={() => console.log('Filter attendance')}
        showExport
        onExportClick={() => console.log('Export attendance')}
        exportTitle="Export"
        afterTabs={
          activeTab === 'today' ? (
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

      <TableResultsCount count={resultCount} />

      {activeTab === 'today' && (
        <HRDataTableCard>
          <Table
            columns={todayColumns}
            data={todayRows}
            keyField="employeeId"
            variant="modern"
            onRowClick={(row) => router.push(`/employees/${row.employeeId}`)}
          />
          {todayRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <UserCheck className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No attendance records found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search or status filter.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'monthly' && (
        <HRSectionCard>
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
        </HRSectionCard>
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
          <Table columns={overtimeColumns} data={overtimeRows} keyField="id" variant="modern" />
          {overtimeRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <Clock className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No overtime records found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'reports' && (
        <HRSectionCard>
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
        </HRSectionCard>
      )}
    </HRModulePage>
  )
}
