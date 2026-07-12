'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2,
  UserRound,
  Briefcase,
  Wallet,
  FileText,
  CalendarDays,
  Clock,
  Target,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Banknote,
  TrendingDown,
  Trophy,
  Activity,
} from 'lucide-react'
import {
  Button,
  Card,
  Avatar,
  Badge,
  Input,
  Table,
  EmptyState,
  EntityFilesPanel,
  ActivitiesTimeline,
  ProgressBar,
  SidebarCardTitle,
  TableCellText,
  TableCellDateOnly,
  LoadingSpinner,
  Modal,
  TableResultsCount,
} from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import HRDataTableCard from '../shared/HRDataTableCard'
import { EmployeeStatusPill } from './EmployeeTableCells'
import { employeeStatusBadgeVariant } from '../../lib/employeeStatus'
import {
  fetchEmployeeActivityTimeline,
  fetchEmployeeCrossAppActivity,
} from '../../lib/api/employeeActivityService'
import { listAttendanceRecords } from '../../lib/attendanceSyncService'
import { formatShiftLabel } from '../../lib/shiftShared'
import {
  ATTENDANCE_UPDATED_EVENT,
  buildEmployeeMonthAttendanceLogs,
  toDateInputValue,
} from '../../lib/attendanceShared'
import { listLeaveRequests } from '../../lib/leaveSyncService'
import {
  computeEmployeeLeaveBalanceRows,
  LEAVE_UPDATED_EVENT,
} from '../../lib/leaveShared'
import { listEmployeePayrollLineItems, deletePayrollLineItem } from '../../lib/payrollSyncService'
import { mapEmployeePayrollHistoryRow, sortEmployeePayrollHistory } from '../../lib/payrollShared'
import { buildEmployeePayrollColumns, employeePayrollViewHref } from './employeePayrollTableColumns'

const UnifiedWorkspaceCalendar = dynamic(
  () => import('@webfudge/ui').then((m) => ({ default: m.UnifiedWorkspaceCalendar })),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500">
        Loading attendance calendar…
      </div>
    ),
  },
)

const ATTENDANCE_STATUS_META = {
  present: {
    label: 'Present',
    dotClass: 'bg-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  absent: {
    label: 'Absent',
    dotClass: 'bg-red-400',
    badgeClass: 'bg-red-50 text-red-800 ring-red-200',
  },
  not_marked: {
    label: 'Not Marked',
    dotClass: 'bg-gray-300',
    badgeClass: 'bg-gray-50 text-gray-700 ring-gray-200',
  },
  leave: {
    label: 'On Leave',
    dotClass: 'bg-orange-300',
    badgeClass: 'bg-orange-50 text-orange-800 ring-orange-200',
  },
  wfh: {
    label: 'WFH',
    dotClass: 'bg-blue-400',
    badgeClass: 'bg-blue-50 text-blue-800 ring-blue-200',
  },
}

const detailLabelClass =
  'mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500'

function DetailCell({ label, icon: Icon, children, className = '' }) {
  return (
    <div className={`group min-w-0 bg-white px-6 py-5 transition-colors hover:bg-orange-50/35 ${className}`}>
      <div className={detailLabelClass}>
        {Icon ? (
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-400 ring-1 ring-gray-100 transition-colors group-hover:bg-orange-100 group-hover:text-orange-600 group-hover:ring-orange-200">
            <Icon className="h-3.5 w-3.5" aria-hidden />
          </span>
        ) : null}
        <span>{label}</span>
      </div>
      {children}
    </div>
  )
}

function GridRow({ children, cols = 2, className = '' }) {
  const colClass =
    cols === 3
      ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      : cols === 4
        ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
        : 'grid-cols-1 sm:grid-cols-2'

  return (
    <div
      className={`grid divide-y divide-gray-100 border-b border-gray-100 sm:divide-x sm:divide-y-0 ${colClass} ${className}`}
    >
      {children}
    </div>
  )
}

function DetailSectionHeader({ title, description, icon: Icon }) {
  return (
    <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 via-white to-orange-50/50 px-6 py-3.5">
      <div className="flex items-center gap-2">
        {Icon ? (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-orange-600 ring-1 ring-orange-200/80">
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">{title}</h3>
          {description ? <p className="mt-0.5 text-xs text-gray-500">{description}</p> : null}
        </div>
      </div>
    </div>
  )
}

function DetailValue({ value, emphasize = false }) {
  const raw = value == null ? '' : String(value).trim()
  const empty = !raw || raw === '—'
  const display = empty ? '—' : raw

  if (!empty && emphasize) {
    return (
      <span className="inline-flex rounded-lg bg-orange-50 px-3 py-2 text-base font-semibold text-orange-900 shadow-sm ring-1 ring-orange-200/80">
        {display}
      </span>
    )
  }

  return (
    <div className="min-h-8">
      {empty ? (
        <span className="inline-flex rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-400">
          Not added
        </span>
      ) : (
        <p className="text-base font-semibold leading-snug text-gray-900">{display}</p>
      )}
    </div>
  )
}

function HeaderPill({ icon: Icon, label }) {
  if (!label || label === '—') return null

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm">
      {Icon ? <Icon className="h-3.5 w-3.5 text-orange-500" aria-hidden /> : null}
      {label}
    </span>
  )
}

function SidebarPanelHeader({ title, description, icon: Icon }) {
  return (
    <div className="border-b border-gray-100 px-6 py-5">
      <div className="flex items-center gap-2">
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-orange-500" aria-hidden /> : null}
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">{title}</h3>
      </div>
      {description ? <p className="mt-1.5 text-sm text-gray-500">{description}</p> : null}
    </div>
  )
}

function SnapshotTile({ label, value, icon: Icon, accent = false }) {
  return (
    <div
      className={`rounded-xl border px-4 py-3.5 shadow-sm ${
        accent
          ? 'border-orange-200 bg-gradient-to-br from-orange-50 via-white to-orange-50/70'
          : 'border-gray-100 bg-white'
      }`}
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-gray-500">
        {Icon ? <Icon className={accent ? 'h-4 w-4 text-orange-500' : 'h-4 w-4 text-gray-400'} aria-hidden /> : null}
        <span>{label}</span>
      </div>
      <p className="truncate text-base font-semibold leading-snug text-gray-900">{value || '—'}</p>
    </div>
  )
}

function InlineDetailCell({ children, className = '' }) {
  return <div className={`min-w-0 bg-white px-6 py-5 ${className}`}>{children}</div>
}

function EmployeeStatusChip({ status }) {
  if (status === 'Active') {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-xl border border-emerald-300/90 bg-gradient-to-br from-emerald-50 via-emerald-50 to-emerald-100 px-4 py-2.5 text-sm font-bold uppercase tracking-widest text-emerald-900 shadow-md ring-2 ring-emerald-200/70"
        role="status"
      >
        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.25} aria-hidden />
        {status}
      </span>
    )
  }
  return <EmployeeStatusPill status={status} />
}

function formatInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function EmployeeOverviewPanel({
  employee,
  editing = false,
  draft,
  departments = [],
  managerRoleOptions = [],
  salaryStructureOptions = [],
  saving = false,
  saveError = '',
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDraftChange,
}) {
  const departmentOptions = departments.map((name) => ({ value: name, label: name }))
  const reportingRoleOptions = managerRoleOptions.map((role) => ({
    value: String(role.value || '').toLowerCase(),
    label: role.label,
  }))
  const employmentTypeOptions = [
    { value: 'Full-time', label: 'Full-time' },
    { value: 'Contract', label: 'Contract' },
    { value: 'Intern', label: 'Intern' },
  ]
  const statusOptions = [
    { value: 'Active', label: 'Active' },
    { value: 'Probation', label: 'Probation' },
    { value: 'Notice', label: 'On Notice' },
    { value: 'Exited', label: 'Exited' },
  ]

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
          <div className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-br from-orange-50/80 via-white to-white px-6 pt-6 pb-5">
            <div
              className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-orange-100/70 blur-2xl"
              aria-hidden
            />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 flex-1 items-center gap-4">
                <Avatar
                  alt={employee.name}
                  fallback={employee.name?.charAt(0)}
                  size="lg"
                  className="!h-20 !w-20 shrink-0 bg-gradient-to-br from-slate-700 to-slate-900 text-xl font-semibold text-white ring-4 ring-white shadow-md"
                />
                <div className="min-w-0 text-left">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-orange-600">
                    Employee details
                  </p>
                  <h2 className="truncate text-xl font-semibold text-gray-900">{employee.name}</h2>
                  <p className="mt-1.5 text-base text-gray-500">
                    {employee.designation || 'Personal, employment, and payroll information.'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <HeaderPill icon={Briefcase} label={employee.department} />
                    <HeaderPill icon={CreditCard} label={employee.employeeId} />
                    <HeaderPill icon={MapPin} label={employee.workLocation || employee.location} />
                  </div>
                  <div className="mt-2 sm:hidden">
                    <EmployeeStatusPill status={employee.status} />
                  </div>
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <EmployeeStatusChip status={employee.status} />
              </div>
            </div>
          </div>

          {editing && draft ? (
            <>
              <DetailSectionHeader
                title="Personal information"
                description="Update the employee's name and contact details"
                icon={UserRound}
              />
              <GridRow cols={3}>
                <InlineDetailCell>
                  <Input
                    label="Full name"
                    value={draft.fullName}
                    onChange={(e) => onDraftChange?.('fullName', e.target.value)}
                    disabled={saving}
                    required
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="Work email"
                    type="email"
                    value={draft.email}
                    onChange={(e) => onDraftChange?.('email', e.target.value)}
                    disabled={saving}
                    icon={Mail}
                    required
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="Phone"
                    type="tel"
                    value={draft.phone}
                    onChange={(e) => onDraftChange?.('phone', e.target.value)}
                    disabled={saving}
                    icon={Phone}
                  />
                </InlineDetailCell>
              </GridRow>

              <DetailSectionHeader
                title="Employment"
                description="Role, reporting, schedule, and work setup"
                icon={Briefcase}
              />
              <GridRow cols={3}>
                <InlineDetailCell>
                  <Select
                    label="Department"
                    value={draft.department}
                    options={departmentOptions}
                    onChange={(value) => onDraftChange?.('department', value)}
                    disabled={saving}
                    placeholder="Select department"
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="Designation"
                    value={draft.designation}
                    onChange={(e) => onDraftChange?.('designation', e.target.value)}
                    disabled={saving}
                    required
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="Join date"
                    type="date"
                    value={draft.joinDate}
                    onChange={(e) => onDraftChange?.('joinDate', e.target.value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
              </GridRow>

              <GridRow cols={3}>
                <InlineDetailCell>
                  <Input
                    label="Location"
                    value={draft.location}
                    onChange={(e) => onDraftChange?.('location', e.target.value)}
                    disabled={saving}
                    icon={MapPin}
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Select
                    label="Reporting manager"
                    value={draft.reportingRole}
                    options={reportingRoleOptions}
                    onChange={(value) => {
                      onDraftChange?.('reportingRole', value)
                      onDraftChange?.('manager', value === 'admin' ? 'Admin' : 'Manager')
                    }}
                    disabled={saving}
                    placeholder="Select manager role"
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Select
                    label="Employment type"
                    value={draft.employmentType}
                    options={employmentTypeOptions}
                    onChange={(value) => onDraftChange?.('employmentType', value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
              </GridRow>

              <DetailSectionHeader
                title="Bank & payroll"
                description="Compensation, salary structure, and bank details"
                icon={Wallet}
              />
              <GridRow cols={3}>
                <InlineDetailCell>
                  <Input
                    label="Annual CTC"
                    type="number"
                    min="0"
                    value={draft.annualCtc || ''}
                    onChange={(e) => onDraftChange?.('annualCtc', e.target.value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Select
                    label="Salary structure"
                    value={draft.salaryStructureId || ''}
                    options={salaryStructureOptions}
                    onChange={(value) => onDraftChange?.('salaryStructureId', value)}
                    disabled={saving}
                    placeholder="Select salary structure"
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Select
                    label="Status"
                    value={draft.status}
                    options={statusOptions}
                    onChange={(value) => onDraftChange?.('status', value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
              </GridRow>

              <GridRow cols={3} className="border-b-0">
                <InlineDetailCell>
                  <Input
                    label="Bank account number"
                    value={draft.bankAccountNumber || ''}
                    onChange={(e) => onDraftChange?.('bankAccountNumber', e.target.value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="IFSC"
                    value={draft.bankIfsc || ''}
                    onChange={(e) => onDraftChange?.('bankIfsc', e.target.value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
                <InlineDetailCell>
                  <Input
                    label="Bank name"
                    value={draft.bankName || ''}
                    onChange={(e) => onDraftChange?.('bankName', e.target.value)}
                    disabled={saving}
                  />
                </InlineDetailCell>
              </GridRow>

              {saveError ? <p className="px-6 pt-4 text-center text-sm text-red-600">{saveError}</p> : null}

              <div className="flex flex-wrap items-center justify-center gap-3 border-t border-gray-100 bg-gray-50/60 px-6 py-4">
                <Button type="button" variant="primary" disabled={saving} onClick={onSaveEdit}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="secondary" disabled={saving} onClick={onCancelEdit}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <>
              <DetailSectionHeader
                title="Personal information"
                description="Contact and identity details"
                icon={UserRound}
              />
              <GridRow cols={4}>
                <DetailCell label="Date of birth" icon={CalendarDays}>
                  <DetailValue value={employee.dob || '—'} />
                </DetailCell>
                <DetailCell label="Gender" icon={UserRound}>
                  <DetailValue value={employee.gender || '—'} />
                </DetailCell>
                <DetailCell label="Phone" icon={Phone}>
                  <DetailValue value={employee.phone || '—'} />
                </DetailCell>
                <DetailCell label="Email" icon={Mail}>
                  <DetailValue value={employee.email || '—'} />
                </DetailCell>
              </GridRow>

              <DetailSectionHeader
                title="Employment"
                description="Role, reporting, schedule, and work setup"
                icon={Briefcase}
              />
              <GridRow cols={3}>
                <DetailCell label="Work location" icon={MapPin}>
                  <DetailValue value={employee.workLocation || employee.location || '—'} />
                </DetailCell>
                <DetailCell label="Contract type" icon={Briefcase}>
                  <DetailValue value={employee.contractType || 'Permanent'} />
                </DetailCell>
                <DetailCell label="Shift" icon={Clock}>
                  <DetailValue
                    value={
                      employee.flexibleShift
                        ? `Flexible — ${(employee.assignedShifts || ['morning'])
                            .map((shiftId) => formatShiftLabel(shiftId))
                            .join(', ')}`
                        : formatShiftLabel(employee.primaryShift || employee.shift || 'morning')
                    }
                  />
                </DetailCell>
              </GridRow>

              <GridRow cols={3}>
                <DetailCell label="Manager" icon={UserRound}>
                  <DetailValue value={employee.manager || '—'} />
                </DetailCell>
                <DetailCell label="Employment type" icon={Briefcase}>
                  <DetailValue value={employee.employmentType || '—'} />
                </DetailCell>
                <DetailCell label="Employee ID" icon={CreditCard}>
                  <DetailValue value={employee.employeeId || '—'} emphasize />
                </DetailCell>
              </GridRow>

              <DetailSectionHeader
                title="Bank & payroll"
                description="Compensation and statutory identifiers"
                icon={Wallet}
              />
              <GridRow cols={3} className="border-b-0">
                <DetailCell label="Annual CTC" icon={Wallet}>
                  <DetailValue value={employee.annualCtc ? formatInr(employee.annualCtc) : '—'} emphasize />
                </DetailCell>
                <DetailCell label="Bank" icon={Wallet}>
                  <DetailValue value={employee.bankName || '—'} />
                </DetailCell>
                <DetailCell label="Account" icon={Wallet}>
                  <DetailValue value={employee.bankAccountNumber || employee.accountNo || '—'} />
                </DetailCell>
                <DetailCell label="IFSC" icon={Wallet}>
                  <DetailValue value={employee.bankIfsc || '—'} />
                </DetailCell>
                <DetailCell label="PAN" icon={CreditCard}>
                  <DetailValue value={employee.pan || '—'} />
                </DetailCell>
                <DetailCell label="UAN" icon={CreditCard}>
                  <DetailValue value={employee.uan || '—'} />
                </DetailCell>
              </GridRow>

              <p className="border-t border-gray-100 bg-gray-50/60 px-6 py-4 text-center text-sm text-gray-500">
                <button
                  type="button"
                  onClick={onEdit}
                  className="font-medium text-orange-600 hover:underline"
                >
                  Edit employee details
                </button>
                <span className="mx-2 text-gray-300" aria-hidden>
                  ·
                </span>
                <Link
                  href={`/employees/${employee.id}/edit`}
                  className="font-medium text-gray-500 hover:text-orange-600 hover:underline"
                >
                  Full edit page
                </Link>
              </p>
            </>
          )}
        </Card>
      </div>

      <div className="space-y-4">
        <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
          <SidebarPanelHeader
            title="At a glance"
            description="Quick profile and attendance snapshot."
            icon={Clock}
          />
          <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <SnapshotTile label="Joined" value={employee.joinDate} icon={CalendarDays} accent />
            <SnapshotTile label="Department" value={employee.department} icon={Briefcase} />
            <SnapshotTile
              label="Location"
              value={employee.workLocation || employee.location || '—'}
              icon={MapPin}
            />
            <SnapshotTile
              label="Attendance"
              value="Open Attendance tab"
              icon={CheckCircle2}
              accent
            />
          </div>
          <p className="border-t border-gray-100 px-5 py-3 text-center text-xs text-gray-500">
            Live attendance and leave data are on the Attendance and Leave tabs.
          </p>
        </Card>

        <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
          <SidebarPanelHeader
            title="Leave balance"
            description="Available leave across active policies."
            icon={CalendarDays}
          />
          <div className="px-6 py-8 text-center">
            <p className="text-sm text-gray-500">Balances and requests sync from the Leave hub.</p>
            <Link
              href="/leave"
              className="mt-3 inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Open Leave tab
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}

export function EmployeeDocumentsPanel({ employee, documents = [], filesProps, canEdit = true }) {
  const subjectId = employee?.membershipId

  if (subjectId && filesProps) {
    return (
      <EntityFilesPanel
        subjectType="organization_user"
        subjectId={subjectId}
        canEdit={canEdit}
        title="Employee documents"
        emptyDescription="Upload offer letters, identity proofs, bank documents, or other files linked to this employee."
        {...filesProps}
      />
    )
  }

  if (!documents.length) {
    return (
      <Card variant="elevated" className="rounded-xl">
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Employee documents will appear here once this employee is synced with an organization membership."
        />
      </Card>
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'DOCUMENT',
      width: 220,
      render: (_, row) => <TableCellText value={row.name} className="font-medium" />,
    },
    {
      key: 'date',
      label: 'UPLOADED',
      width: 140,
      render: (_, row) => <TableCellDateOnly dateString={row.date} />,
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 130,
      render: (_, row) => (
        <Badge variant={employeeStatusBadgeVariant(row.status)} size="sm" className="capitalize">
          {row.status}
        </Badge>
      ),
    },
    {
      key: 'actions',
      label: '',
      width: 120,
      render: () => (
        <Button variant="secondary" size="sm">
          Download
        </Button>
      ),
    },
  ]

  return (
    <HRDataTableCard>
      <Table variant="modernEmbedded" columns={columns} data={documents} keyField="name" />
    </HRDataTableCard>
  )
}

export function EmployeeAttendancePanel({ employee }) {
  const [monthDate, setMonthDate] = useState(() => new Date())
  const [records, setRecords] = useState([])
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [selectedLog, setSelectedLog] = useState(null)

  const orgUserId = employee?.membershipId || employee?.id
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth() + 1
  const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const initialCalendarDate = `${year}-${String(month).padStart(2, '0')}-01`

  const loadData = useCallback(async () => {
    if (!orgUserId) {
      setRecords([])
      setLeaveRequests([])
      setLoading(false)
      return
    }

    const from = `${year}-${String(month).padStart(2, '0')}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    try {
      setLoading(true)
      setLoadError('')
      const [attendanceRows, leaveRows] = await Promise.all([
        listAttendanceRecords({ organizationUser: orgUserId, from, to, limit: 62 }),
        listLeaveRequests({ organizationUser: orgUserId, limit: 100 }),
      ])
      setRecords(attendanceRows)
      setLeaveRequests(leaveRows)
    } catch (error) {
      setLoadError(error?.message || 'Could not load attendance')
      setRecords([])
      setLeaveRequests([])
    } finally {
      setLoading(false)
    }
  }, [orgUserId, year, month])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
    window.addEventListener(LEAVE_UPDATED_EVENT, refresh)
    return () => {
      window.removeEventListener(ATTENDANCE_UPDATED_EVENT, refresh)
      window.removeEventListener(LEAVE_UPDATED_EVENT, refresh)
    }
  }, [loadData])

  const attendanceLogs = useMemo(() => {
    const rawLogs = buildEmployeeMonthAttendanceLogs({
      employee,
      records,
      leaveRequests,
      year,
      month,
    })

    return rawLogs.map((log) => {
      const meta = ATTENDANCE_STATUS_META[log.status] || ATTENDANCE_STATUS_META.not_marked
      return {
        ...log,
        label: meta.label,
        dotClass: meta.dotClass,
        badgeClass: meta.badgeClass,
      }
    })
  }, [employee, records, leaveRequests, year, month])

  useEffect(() => {
    if (!attendanceLogs.length) {
      setSelectedLog(null)
      return
    }
    const today = toDateInputValue(new Date())
    const todayLog = attendanceLogs.find((log) => log.date === today)
    setSelectedLog(todayLog || attendanceLogs[0])
  }, [attendanceLogs])

  const summary = useMemo(
    () =>
      attendanceLogs.reduce(
        (acc, log) => {
          acc[log.status] = (acc[log.status] || 0) + 1
          return acc
        },
        { present: 0, absent: 0, leave: 0, wfh: 0, not_marked: 0 },
      ),
    [attendanceLogs],
  )

  const events = attendanceLogs.map((log) => ({
    id: log.id,
    title: log.label,
    start: log.date,
    allDay: true,
    extendedProps: {
      kind: 'attendance',
      entity: log,
    },
  }))

  const activeLog = selectedLog || attendanceLogs[0]

  if (!employee?.membershipId && !employee?.id) {
    return (
      <Card variant="elevated" className="rounded-xl p-8">
        <EmptyState
          icon={Clock}
          title="Attendance unavailable"
          description="This employee must be synced with an organization membership before attendance can load."
        />
      </Card>
    )
  }

  if (loading && !attendanceLogs.length) {
    return (
      <Card variant="elevated" className="flex justify-center rounded-xl p-12">
        <LoadingSpinner message="Loading attendance..." />
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card variant="elevated" className="rounded-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">{monthLabel}</h3>
            <p className="text-sm text-gray-500">
              Calendar view with saved logs and approved leave auto-detected.
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {summary.present} present · {summary.leave} on leave · {summary.not_marked} not marked · {summary.absent} absent · {summary.wfh} WFH
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              type="month"
              value={`${year}-${String(month).padStart(2, '0')}`}
              onChange={(event) => {
                const [nextYear, nextMonth] = String(event.target.value || '').split('-').map(Number)
                if (nextYear && nextMonth) {
                  setMonthDate(new Date(nextYear, nextMonth - 1, 1))
                }
              }}
              className="!w-auto"
            />
            <div className="flex flex-wrap gap-2">
              {Object.entries(ATTENDANCE_STATUS_META).map(([key, item]) => (
                <span key={key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                  <span className={`h-2.5 w-2.5 rounded-full ${item.dotClass}`} aria-hidden />
                  {item.label}
                </span>
              ))}
            </div>
            <Link
              href="/attendance"
              className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
            >
              Attendance hub
            </Link>
          </div>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">{loadError}</p>
        ) : null}

        <UnifiedWorkspaceCalendar
          events={events}
          initialDate={initialCalendarDate}
          onEventClick={({ kind, entity }) => {
            if (kind === 'attendance') setSelectedLog(entity)
          }}
          height="auto"
        />
      </Card>

      <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
        <SidebarPanelHeader title="Marked log" description="Click any calendar entry to inspect the day." icon={Clock} />
        {activeLog ? (
          <div className="space-y-4 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Selected date</p>
              <p className="mt-1 text-lg font-semibold text-gray-900">
                {new Date(`${activeLog.date}T12:00:00`).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
            <span
              className={`inline-flex rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ${activeLog.badgeClass}`}
            >
              {activeLog.label}
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs font-medium text-gray-500">Check in</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{activeLog.checkIn || '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs font-medium text-gray-500">Check out</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{activeLog.checkOut || '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs font-medium text-gray-500">Hours</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{activeLog.hours || '—'}</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-xs font-medium text-gray-500">Source</p>
                <p className="mt-1 text-sm font-semibold text-gray-900">{activeLog.source || 'HR log'}</p>
              </div>
            </div>
            <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Note</p>
              <p className="mt-1 text-sm text-orange-950">{activeLog.note}</p>
            </div>
          </div>
        ) : (
          <div className="p-5">
            <EmptyState icon={Clock} title="No logs" description="No attendance data for this month yet." className="py-4" />
          </div>
        )}
      </Card>
    </div>
  )
}

export function EmployeeLeavePanel({ employee }) {
  const [leaveRequests, setLeaveRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const orgUserId = employee?.membershipId || employee?.id

  const loadData = useCallback(async () => {
    if (!orgUserId) {
      setLeaveRequests([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError('')
      const rows = await listLeaveRequests({ organizationUser: orgUserId, limit: 100 })
      setLeaveRequests(rows)
    } catch (error) {
      setLoadError(error?.message || 'Could not load leave requests')
      setLeaveRequests([])
    } finally {
      setLoading(false)
    }
  }, [orgUserId])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const refresh = () => loadData()
    window.addEventListener(LEAVE_UPDATED_EVENT, refresh)
    return () => window.removeEventListener(LEAVE_UPDATED_EVENT, refresh)
  }, [loadData])

  const leaveBalance = useMemo(
    () => computeEmployeeLeaveBalanceRows(employee, leaveRequests),
    [employee, leaveRequests],
  )

  const totalEntitlement = leaveBalance.reduce((sum, row) => sum + row.entitlement, 0)
  const totalUsed = leaveBalance.reduce((sum, row) => sum + row.used, 0)
  const totalBalance = leaveBalance.reduce((sum, row) => sum + row.balance, 0)
  const pendingRequests = leaveRequests.filter((row) => row.status === 'Pending').length
  const requestColumns = [
    {
      key: 'type',
      label: 'REQUEST',
      width: 180,
      render: (_, row) => (
        <div>
          <TableCellText value={row.type} className="font-semibold" />
          <p className="mt-0.5 truncate text-xs text-gray-500">{row.reason || 'No reason added'}</p>
        </div>
      ),
    },
    {
      key: 'from',
      label: 'FROM',
      width: 120,
      render: (_, row) => <TableCellDateOnly dateString={row.from} />,
    },
    {
      key: 'to',
      label: 'TO',
      width: 120,
      render: (_, row) => <TableCellDateOnly dateString={row.to} />,
    },
    {
      key: 'days',
      label: 'DAYS',
      width: 80,
      render: (_, row) => <TableCellText value={row.days} className="tabular-nums font-semibold" />,
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 120,
      render: (_, row) => (
        <Badge variant={employeeStatusBadgeVariant(row.status)} size="sm" className="capitalize">
          {row.status}
        </Badge>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 via-white to-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-orange-500" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">Leave balance</h3>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Entitlement, usage, and available leave for this cycle.</p>
          </div>
          <Link
            href="/leave"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Leave hub
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-3 border-b border-gray-100 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Available</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-orange-950">{totalBalance}</p>
            <p className="text-xs text-orange-700">of {totalEntitlement} days</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Used</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{totalUsed}</p>
            <p className="text-xs text-gray-500">days this cycle</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Pending</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{pendingRequests}</p>
            <p className="text-xs text-gray-500">open requests</p>
          </div>
        </div>

        {loadError ? (
          <p className="border-b border-gray-100 px-5 py-3 text-sm text-red-600">{loadError}</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
          {leaveBalance.map((row) => {
            const usedPercent = Math.min(100, Math.round((row.used / row.entitlement) * 100))
            const balancePercent = Math.min(100, Math.round((row.balance / row.entitlement) * 100))
            return (
              <div key={row.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-gray-900">{row.type}</p>
                    <p className="text-xs text-gray-500">{row.entitlement} days entitlement</p>
                  </div>
                  <span className="rounded-lg bg-orange-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-orange-900 ring-1 ring-orange-200/70">
                    {row.balance} left
                  </span>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-xs font-medium text-gray-500">
                    <span>Used {row.used}</span>
                    <span>{usedPercent}% used</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-400 to-orange-500"
                      style={{ width: `${usedPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Balance</span>
                    <span className="font-semibold text-gray-700">{balancePercent}% remaining</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <Card variant="elevated" className="rounded-xl space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <SidebarCardTitle title="Recent requests" icon={CalendarDays} />
            <p className="-mt-2 text-sm text-gray-500">Employee-specific leave history and approvals.</p>
          </div>
          <Link
            href="/leave"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Leave hub
          </Link>
        </div>
        {leaveRequests.length ? (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <Table variant="modernEmbedded" columns={requestColumns} data={leaveRequests} keyField="id" />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              description="Requests for this employee will appear here."
              className="py-2"
              action={
                <Button as={Link} href="/leave" variant="secondary" size="sm">
                  Create request in Leave hub
                </Button>
              }
            />
          </div>
        )}
      </Card>
    </div>
  )
}

export function EmployeePayrollPanel({ employee }) {
  const router = useRouter()
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const orgUserId = employee?.membershipId || employee?.id

  const loadData = useCallback(async () => {
    if (!orgUserId) {
      setPayslips([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setLoadError('')
      const rows = await listEmployeePayrollLineItems(orgUserId)
      setPayslips(sortEmployeePayrollHistory(rows.map(mapEmployeePayrollHistoryRow)))
    } catch (error) {
      setLoadError(error?.message || 'Could not load payroll history')
      setPayslips([])
    } finally {
      setLoading(false)
    }
  }, [orgUserId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const latestPayslip = payslips[0] || null
  const totalNet = payslips.reduce((sum, row) => sum + Number(row.net || 0), 0)
  const totalDeductions = payslips.reduce((sum, row) => sum + Number(row.deductions || 0), 0)

  const handleView = useCallback(
    (row) => {
      router.push(employeePayrollViewHref(row, employee))
    },
    [router, employee],
  )

  const handleDeleteRequest = useCallback((row) => {
    setDeleteTarget(row)
    setDeleteOpen(true)
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget?.lineItemId) return
    try {
      setDeleting(true)
      setDeletingId(deleteTarget.lineItemId)
      setLoadError('')
      await deletePayrollLineItem(deleteTarget.lineItemPk || deleteTarget.lineItemId)
      setDeleteOpen(false)
      setDeleteTarget(null)
      await loadData()
    } catch (error) {
      setLoadError(error?.message || 'Failed to remove payroll record')
    } finally {
      setDeleting(false)
      setDeletingId(null)
    }
  }, [deleteTarget, loadData])

  const columns = useMemo(
    () =>
      buildEmployeePayrollColumns({
        onView: handleView,
        onDelete: handleDeleteRequest,
        deletingId,
      }),
    [handleView, handleDeleteRequest, deletingId],
  )

  if (loading) {
    return (
      <Card variant="elevated" className="flex justify-center rounded-xl p-12">
        <LoadingSpinner message="Loading payroll history…" />
      </Card>
    )
  }

  if (!orgUserId) {
    return (
      <Card variant="elevated" className="rounded-xl p-8">
        <EmptyState
          icon={Wallet}
          title="Payroll unavailable"
          description="This employee is not linked to an organization membership yet."
          className="py-2"
        />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {loadError ? <p className="text-sm text-red-600">{loadError}</p> : null}
      <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 via-white to-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-orange-500" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">Payroll summary</h3>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Latest pay, deductions, and payslip history.</p>
          </div>
          <Link
            href="/payroll"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Payroll hub
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <Banknote className="h-4 w-4" aria-hidden />
              Latest net
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-orange-950">
              {latestPayslip ? formatInr(latestPayslip.net) : '—'}
            </p>
            <p className="text-xs text-orange-700">{latestPayslip?.month || 'No payroll run yet'}</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <TrendingDown className="h-4 w-4" aria-hidden />
              Deductions
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{formatInr(totalDeductions)}</p>
            <p className="text-xs text-gray-500">across {payslips.length} payslips</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <Wallet className="h-4 w-4" aria-hidden />
              Net paid
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{formatInr(totalNet)}</p>
            <p className="text-xs text-gray-500">recorded in history</p>
          </div>
        </div>
      </Card>
      {payslips.length ? (
        <>
          <TableResultsCount count={payslips.length} />
          <HRDataTableCard>
            <Table
              variant="modernEmbedded"
              columns={columns}
              data={payslips}
              keyField="id"
              onRowClick={(row) => handleView(row)}
            />
          </HRDataTableCard>
        </>
      ) : (
        <Card variant="elevated" className="rounded-xl p-8">
          <EmptyState
            icon={Wallet}
            title="No payroll history"
            description="Payroll runs for this employee will appear here after the first run is calculated."
            className="py-2"
            action={
              <Button as={Link} href="/payroll" variant="secondary" size="sm">
                Open payroll hub
              </Button>
            }
          />
        </Card>
      )}

      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
          setDeleteTarget(null)
        }}
        title="Remove payroll record"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Remove{' '}
          <span className="font-semibold text-gray-900">{deleteTarget?.month || 'this payroll record'}</span> from the
          payroll run? This cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={deleting}
            onClick={() => {
              setDeleteOpen(false)
              setDeleteTarget(null)
            }}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="!bg-red-600 hover:!bg-red-700"
            disabled={deleting}
            onClick={handleDeleteConfirm}
          >
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

export function EmployeePerformancePanel({ okrs }) {
  const avgProgress = okrs.length
    ? Math.round(okrs.reduce((sum, row) => sum + Number(row.progress || 0), 0) / okrs.length)
    : 0
  const completedGoals = okrs.filter((row) => Number(row.progress || 0) >= 90).length

  return (
    <div className="space-y-4">
      <Card variant="elevated" padding={false} className="overflow-hidden rounded-xl">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 bg-gradient-to-r from-orange-50/80 via-white to-white px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-orange-500" aria-hidden />
              <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-700">Performance snapshot</h3>
            </div>
            <p className="mt-1.5 text-sm text-gray-500">Review score, goal progress, and current OKRs.</p>
          </div>
          <Link
            href="/performance"
            className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            Performance hub
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
          <div className="rounded-xl border border-orange-100 bg-orange-50/70 px-4 py-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-orange-700">
              <Trophy className="h-4 w-4" aria-hidden />
              Last review
            </div>
            <p className="mt-1 text-2xl font-bold tabular-nums text-orange-950">4.2/5</p>
            <p className="text-xs text-orange-700">Reviewed by Ravi Menon</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Goal progress</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{avgProgress}%</p>
            <p className="text-xs text-gray-500">average completion</p>
          </div>
          <div className="rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Near completion</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{completedGoals}</p>
            <p className="text-xs text-gray-500">goals at 90%+</p>
          </div>
        </div>
      </Card>

      <Card variant="elevated" className="rounded-xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <SidebarCardTitle title="Goals & OKRs" icon={Target} />
            <p className="-mt-2 text-sm text-gray-500">Active objectives for the current review cycle.</p>
          </div>
        </div>

        {okrs.length ? (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {okrs.map((o) => (
              <div key={o.title} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="text-sm font-semibold leading-snug text-gray-900">{o.title}</p>
                  <span className="rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold tabular-nums text-orange-900 ring-1 ring-orange-200/70">
                    {o.progress}%
                  </span>
                </div>
                <ProgressBar value={o.progress} />
                <p className="mt-2 text-xs text-gray-500">
                  {o.progress >= 90 ? 'Nearly complete' : o.progress >= 50 ? 'On track' : 'Needs attention'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="OKRs and review cycles will show up here."
            className="py-6"
          />
        )}
      </Card>
    </div>
  )
}

export function EmployeeActivityPanel({ employee, fallbackActivities = [] }) {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadActivities = useCallback(async () => {
    if (!employee?.userId && !employee?.membershipId) {
      setActivities(fallbackActivities)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      const crossApp = employee?.userId
        ? await fetchEmployeeCrossAppActivity({
            userId: employee.userId,
            limit: 80,
          })
        : { data: [] }
      if (crossApp.data.length || !employee?.membershipId) {
        setActivities(crossApp.data)
        return
      }
      const profileTimeline = await fetchEmployeeActivityTimeline({
        organizationUserId: employee.membershipId,
        limit: 80,
      })
      setActivities(profileTimeline.data)
    } catch (e) {
      setError(e?.message || 'Could not load employee activity')
      setActivities([])
    } finally {
      setLoading(false)
    }
  }, [employee?.membershipId, employee?.userId])

  useEffect(() => {
    loadActivities()
  }, [loadActivities])

  const activityCount = activities.length
  const lastActivity = activities[0]?.createdAt
    ? new Date(activities[0].createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—'
  const appCounts = activities.reduce((acc, row) => {
    const type = String(row.subjectType || 'workspace').toLowerCase()
    const bucket = ['task', 'project'].includes(type)
      ? 'PM'
      : ['contact', 'lead_company', 'deal', 'client_account', 'meeting'].includes(type)
        ? 'CRM'
        : type === 'organization_user'
          ? 'Accounts'
          : 'Workspace'
    acc[bucket] = (acc[bucket] || 0) + 1
    return acc
  }, {})

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:items-start">
      <Card variant="elevated" className="rounded-xl space-y-4 lg:col-span-2">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
          <div>
            <SidebarCardTitle title="Activity summary" icon={Activity} />
            <p className="-mt-2 text-sm text-gray-500">User activity across CRM, PM, and workspace apps.</p>
          </div>
          <Button type="button" variant="secondary" size="sm" onClick={loadActivities} disabled={loading}>
            Refresh
          </Button>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-orange-100 bg-orange-50/70 px-3 py-2.5">
            <span className="text-xs font-medium text-orange-700">Total events</span>
            <span className="text-lg font-bold tabular-nums text-orange-900">{activityCount}</span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
            <span className="text-xs font-medium text-gray-600">Last activity</span>
            <span className="text-xs font-semibold text-gray-800">{lastActivity}</span>
          </div>
          {Object.entries(appCounts).length ? (
            Object.entries(appCounts).map(([app, count]) => (
              <div key={app} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <span className="text-xs font-medium text-gray-600">{app}</span>
                <span className="text-xs font-semibold tabular-nums text-gray-800">{count}</span>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
              No cross-app activity found yet.
            </p>
          )}
        </div>
      </Card>

      <Card variant="elevated" className="rounded-xl space-y-4 lg:col-span-3">
        <div className="border-b border-gray-100 pb-4">
          <SidebarCardTitle title="Timeline" icon={Clock} />
          <p className="-mt-2 text-sm text-gray-500">Same activity timeline style used by CRM and PM details.</p>
        </div>
        <ActivitiesTimeline items={activities} loading={loading} error={error} />
      </Card>
    </div>
  )
}
