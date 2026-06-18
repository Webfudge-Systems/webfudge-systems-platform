'use client'

import Link from 'next/link'
import {
  CheckCircle2,
  UserRound,
  Briefcase,
  Wallet,
  FileText,
  CalendarDays,
  Clock,
  Target,
} from 'lucide-react'
import {
  Button,
  Card,
  Avatar,
  Badge,
  Table,
  EmptyState,
  InfoSection,
  InfoRow,
  ActivitiesTimeline,
  ProgressBar,
  SidebarCardTitle,
  TableCellText,
  TableCellDateOnly,
} from '@webfudge/ui'
import HRDataTableCard from '../shared/HRDataTableCard'
import { EmployeeStatusPill } from './EmployeeTableCells'
import { employeeStatusBadgeVariant } from '../../lib/employeeStatus'

const ATTENDANCE_SUMMARY = { present: 18, absent: 1, leave: 2, wfh: 3 }
const LEAVE_BALANCE = [
  { id: 'cl', type: 'CL', entitlement: 12, used: 3, balance: 9 },
  { id: 'sl', type: 'SL', entitlement: 12, used: 1, balance: 11 },
  { id: 'pl', type: 'PL', entitlement: 21, used: 5, balance: 16 },
]

const ATTENDANCE_LEGEND = [
  { key: 'present', label: 'Present', className: 'bg-emerald-200' },
  { key: 'absent', label: 'Absent', className: 'bg-red-200' },
  { key: 'leave', label: 'Leave', className: 'bg-orange-200' },
  { key: 'wfh', label: 'WFH', className: 'bg-blue-200' },
]

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

export function EmployeeOverviewPanel({ employee }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card variant="elevated" className="rounded-xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar
                alt={employee.name}
                fallback={employee.name?.charAt(0)}
                size="lg"
                className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
              />
              <div className="min-w-0 text-left">
                <h2 className="text-xl font-semibold text-gray-900">{employee.name}</h2>
                <p className="mt-0.5 text-base text-gray-500">{employee.designation}</p>
                <div className="mt-2 sm:hidden">
                  <EmployeeStatusPill status={employee.status} />
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <EmployeeStatusChip status={employee.status} />
            </div>
          </div>

          <div className="space-y-5">
            <InfoSection title="Personal information" icon={UserRound} isFirst>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Date of birth" value={employee.dob || '—'} />
                <InfoRow label="Gender" value={employee.gender || '—'} />
                <InfoRow label="Phone" value={employee.phone || '—'} />
                <InfoRow label="Email" value={employee.email || '—'} />
              </div>
            </InfoSection>

            <InfoSection title="Employment" icon={Briefcase}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Work location" value={employee.workLocation || employee.location} />
                <InfoRow label="Contract type" value={employee.contractType || 'Permanent'} />
                <InfoRow label="Shift" value={employee.shift || 'Morning (9–6)'} />
                <InfoRow label="Manager" value={employee.manager || '—'} />
                <InfoRow label="Employment type" value={employee.employmentType || '—'} />
                <InfoRow label="Employee ID" value={employee.employeeId || '—'} emphasize />
              </div>
            </InfoSection>

            <InfoSection title="Bank & payroll" icon={Wallet}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow
                  label="Annual CTC"
                  value={employee.annualCtc ? formatInr(employee.annualCtc) : '—'}
                  emphasize
                />
                <InfoRow label="Bank" value={employee.bankName || '—'} />
                <InfoRow label="Account" value={employee.bankAccountNumber || employee.accountNo || '—'} />
                <InfoRow label="IFSC" value={employee.bankIfsc || '—'} />
                <InfoRow label="PAN" value={employee.pan || '—'} />
                <InfoRow label="UAN" value={employee.uan || '—'} />
              </div>
            </InfoSection>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card variant="elevated" className="rounded-xl">
          <SidebarCardTitle title="At a glance" icon={Clock} />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Joined</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{employee.joinDate}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Department</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">{employee.department}</p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">Location</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {employee.workLocation || employee.location || '—'}
              </p>
            </div>
            <div className="rounded-lg border border-gray-100 bg-white px-3.5 py-3 shadow-sm">
              <p className="text-xs font-medium text-gray-500">June attendance</p>
              <p className="mt-1 text-sm font-semibold text-gray-900">
                {ATTENDANCE_SUMMARY.present} present
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elevated" className="rounded-xl">
          <SidebarCardTitle title="Leave balance" icon={CalendarDays} />
          <ul className="divide-y divide-gray-100">
            {LEAVE_BALANCE.map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="font-medium text-gray-900">{row.type}</span>
                <span className="tabular-nums text-gray-600">
                  <span className="font-semibold text-gray-900">{row.balance}</span>
                  <span className="text-gray-400"> / {row.entitlement}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export function EmployeeDocumentsPanel({ documents }) {
  if (!documents.length) {
    return (
      <Card variant="elevated" className="rounded-xl">
        <EmptyState
          icon={FileText}
          title="No documents"
          description="Employee documents will appear here once uploaded."
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

export function EmployeeAttendancePanel() {
  const types = ['present', 'present', 'leave', 'wfh', 'present', 'absent', 'present']

  return (
    <Card variant="elevated" className="rounded-xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">June 2026</h3>
          <p className="text-sm text-gray-500">Daily attendance snapshot</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {ATTENDANCE_LEGEND.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} aria-hidden />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {Array.from({ length: 28 }, (_, i) => {
          const t = types[i % 7]
          const colors = Object.fromEntries(ATTENDANCE_LEGEND.map((l) => [l.key, l.className]))
          return (
            <div
              key={i}
              className={`flex aspect-square items-center justify-center rounded-lg text-[11px] font-medium text-gray-700 ${colors[t]}`}
            >
              {i + 1}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-gray-100 pt-4 text-sm text-gray-700">
        <span>
          Present <strong className="text-gray-900">{ATTENDANCE_SUMMARY.present}</strong>
        </span>
        <span>
          Absent <strong className="text-gray-900">{ATTENDANCE_SUMMARY.absent}</strong>
        </span>
        <span>
          Leave <strong className="text-gray-900">{ATTENDANCE_SUMMARY.leave}</strong>
        </span>
        <span>
          WFH <strong className="text-gray-900">{ATTENDANCE_SUMMARY.wfh}</strong>
        </span>
      </div>
    </Card>
  )
}

export function EmployeeLeavePanel({ leaveRequests }) {
  const leaveColumns = [
    {
      key: 'type',
      label: 'TYPE',
      width: 80,
      render: (_, row) => <TableCellText value={row.type} className="font-semibold" />,
    },
    {
      key: 'entitlement',
      label: 'ENTITLEMENT',
      width: 110,
      render: (_, row) => <TableCellText value={row.entitlement} className="tabular-nums" />,
    },
    {
      key: 'used',
      label: 'USED',
      width: 80,
      render: (_, row) => <TableCellText value={row.used} className="tabular-nums" />,
    },
    {
      key: 'balance',
      label: 'BALANCE',
      width: 90,
      render: (_, row) => <TableCellText value={row.balance} className="tabular-nums font-semibold" />,
    },
  ]

  return (
    <div className="space-y-4">
      <HRDataTableCard>
        <Table variant="modernEmbedded" columns={leaveColumns} data={LEAVE_BALANCE} keyField="id" />
      </HRDataTableCard>

      <Card variant="elevated" className="rounded-xl">
        <SidebarCardTitle title="Recent requests" icon={CalendarDays} />
        {leaveRequests.length ? (
          <ul className="divide-y divide-gray-100">
            {leaveRequests.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0 text-gray-900">
                  <span className="font-medium">{r.type}</span>
                  <span className="text-gray-500">
                    {' '}
                    · {r.from} – {r.to}
                  </span>
                </span>
                <Badge variant={employeeStatusBadgeVariant(r.status)} size="sm" className="shrink-0 capitalize">
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No recent leave requests</p>
        )}
      </Card>
    </div>
  )
}

export function EmployeePayrollPanel({ payslips }) {
  const columns = [
    {
      key: 'month',
      label: 'MONTH',
      width: 140,
      render: (_, row) => <TableCellText value={row.month} className="font-medium" />,
    },
    {
      key: 'gross',
      label: 'GROSS',
      width: 110,
      render: (_, row) => <TableCellText value={formatInr(row.gross)} className="tabular-nums" />,
    },
    {
      key: 'deductions',
      label: 'DEDUCTIONS',
      width: 110,
      render: (_, row) => <TableCellText value={formatInr(row.deductions)} className="tabular-nums" />,
    },
    {
      key: 'net',
      label: 'NET',
      width: 110,
      render: (_, row) => <TableCellText value={formatInr(row.net)} className="tabular-nums font-semibold" />,
    },
    {
      key: 'status',
      label: 'STATUS',
      width: 100,
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
      <Table variant="modernEmbedded" columns={columns} data={payslips} keyField="month" />
    </HRDataTableCard>
  )
}

export function EmployeePerformancePanel({ okrs }) {
  return (
    <Card variant="elevated" className="rounded-xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <SidebarCardTitle title="Goals & OKRs" icon={Target} />
          <p className="-mt-2 text-sm text-gray-500">Last review: 4.2/5 — Ravi Menon</p>
        </div>
        <Link
          href="/performance"
          className="inline-flex items-center rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
        >
          View performance hub
        </Link>
      </div>

      {okrs.length ? (
        <div className="space-y-4">
          {okrs.map((o) => (
            <div key={o.title}>
              <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-medium text-gray-900">{o.title}</span>
                <span className="tabular-nums font-semibold text-gray-700">{o.progress}%</span>
              </div>
              <ProgressBar value={o.progress} />
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
  )
}

export function EmployeeActivityPanel({ activities }) {
  return (
    <Card variant="elevated" className="rounded-xl">
      {activities.length ? (
        <ActivitiesTimeline items={activities} />
      ) : (
        <EmptyState
          icon={Clock}
          title="No activity yet"
          description="Updates about this employee will appear in the timeline."
        />
      )}
    </Card>
  )
}
