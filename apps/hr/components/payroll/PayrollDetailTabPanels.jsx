'use client'

import Link from 'next/link'
import { CheckCircle2, Wallet, TrendingDown, FileText } from 'lucide-react'
import {
  Card,
  Avatar,
  InfoSection,
  InfoRow,
  Badge,
  Button,
  EmptyState,
} from '@webfudge/ui'
import { formatPayrollInr } from '../../lib/payrollPage'
import { employeeStatusBadgeVariant } from '../../lib/employeeStatus'
import { PayrollStatusBadge } from './PayrollTableCells'

function RecordStatusChip({ status }) {
  if (status === 'Paid' || status === 'Approved') {
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
  return <PayrollStatusBadge status={status} />
}

export function PayrollRecordOverviewPanel({ record, month }) {
  const totalDeductions = (record.pf || 0) + (record.esi || 0) + (record.pt || 0) + (record.tds || 0)

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card variant="elevated" className="rounded-xl">
          <div className="mb-6 flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <Avatar
                alt={record.name}
                fallback={record.name?.charAt(0)}
                size="lg"
                className="!h-20 !w-20 shrink-0 bg-gray-600 text-xl text-white"
              />
              <div className="min-w-0 text-left">
                <h2 className="text-xl font-semibold text-gray-900">{record.name}</h2>
                <p className="mt-0.5 text-base text-gray-500">{record.designation || record.dept}</p>
                <div className="mt-2 sm:hidden">
                  <PayrollStatusBadge status={record.status} />
                </div>
              </div>
            </div>
            <div className="hidden shrink-0 sm:block">
              <RecordStatusChip status={record.status} />
            </div>
          </div>

          <div className="space-y-5">
            <InfoSection title="Pay period" icon={Wallet} isFirst>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Month" value={month} />
                <InfoRow label="Department" value={record.dept} />
                <InfoRow label="Employee ID" value={record.employeeId} emphasize />
                <InfoRow label="Gross pay" value={formatPayrollInr(record.gross)} emphasize />
              </div>
            </InfoSection>

            <InfoSection title="Deductions" icon={TrendingDown}>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                <InfoRow label="Provident fund" value={formatPayrollInr(record.pf)} />
                <InfoRow label="ESI" value={formatPayrollInr(record.esi)} />
                <InfoRow label="Professional tax" value={formatPayrollInr(record.pt)} />
                <InfoRow label="TDS" value={formatPayrollInr(record.tds)} />
                <InfoRow label="Total deductions" value={formatPayrollInr(totalDeductions)} emphasize />
                <InfoRow label="Net pay" value={formatPayrollInr(record.net)} emphasize />
              </div>
            </InfoSection>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card variant="elevated" className="rounded-xl p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Summary</h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">Gross</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{formatPayrollInr(record.gross)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">Deductions</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{formatPayrollInr(totalDeductions)}</dd>
            </div>
            <div className="flex justify-between gap-2 border-t border-gray-100 pt-3">
              <dt className="font-medium text-gray-700">Net pay</dt>
              <dd className="text-base font-bold tabular-nums text-orange-600">{formatPayrollInr(record.net)}</dd>
            </div>
          </dl>
          <Link
            href={`/employees/${record.id}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50"
          >
            View employee profile
          </Link>
        </Card>
      </div>
    </div>
  )
}

export function PayrollPayslipPanel({ record, month }) {
  return (
    <Card variant="elevated" className="rounded-xl p-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Payslip — {month}</h3>
          <p className="text-sm text-gray-500">{record.name} · {record.employeeId}</p>
        </div>
        <Badge variant={employeeStatusBadgeVariant('Generated')} className="capitalize">
          Generated
        </Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoRow label="Gross" value={formatPayrollInr(record.gross)} />
        <InfoRow label="Net" value={formatPayrollInr(record.net)} emphasize />
      </div>
      <Button variant="secondary" size="sm" className="mt-6">
        Download PDF
      </Button>
    </Card>
  )
}

export function PayrollDeductionsPanel({ record }) {
  return (
    <Card variant="elevated" className="rounded-xl p-6">
      <InfoSection title="Statutory breakdown" icon={FileText} isFirst>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow label="PF" value={formatPayrollInr(record.pf)} />
          <InfoRow label="ESI" value={formatPayrollInr(record.esi)} />
          <InfoRow label="PT" value={formatPayrollInr(record.pt)} />
          <InfoRow label="TDS" value={formatPayrollInr(record.tds)} />
        </div>
      </InfoSection>
    </Card>
  )
}

export function PayrollStructureOverviewPanel({ structure }) {
  const ctc = Number(structure.ctc || 0)
  return (
    <Card variant="elevated" className="rounded-xl p-6">
      <InfoSection title="Structure details" icon={FileText} isFirst>
        <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <InfoRow label="Name" value={structure.name} emphasize />
          <InfoRow
            label="Annual CTC"
            value={`₹${ctc.toLocaleString('en-IN')}`}
            emphasize
          />
          <InfoRow label="Basic %" value={`${Number(structure.basicPercent || 0)}%`} />
          <InfoRow label="HRA %" value={`${Number(structure.hraPercent || 0)}%`} />
          <InfoRow label="Special %" value={`${Number(structure.specialAllowancePercent || 0)}%`} />
          <InfoRow label="FBP %" value={`${Number(structure.fbpPercent || 0)}%`} />
        </div>
      </InfoSection>
    </Card>
  )
}

export function PayrollEmptyPanel({ icon: Icon, title, description, action }) {
  return (
    <Card variant="elevated" className="rounded-xl">
      <EmptyState icon={Icon} title={title} description={description} action={action} />
    </Card>
  )
}
