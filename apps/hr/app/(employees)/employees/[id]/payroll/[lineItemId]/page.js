'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Trash2, UserRound, Wallet, TrendingDown, Banknote, FileText } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Modal, TabsWithActions } from '@webfudge/ui'
import HRPageHeader from '../../../../../../components/layout/HRPageHeader'
import EmployeeDetailMetaBar from '../../../../../../components/employees/EmployeeDetailMetaBar'
import PayrollDetailMetaBar from '../../../../../../components/payroll/PayrollDetailMetaBar'
import HRDetailHeaderActions from '../../../../../../components/shared/HRDetailHeaderActions'
import HRDashboardKpiRow from '../../../../../../components/dashboard/HRDashboardKpiRow'
import {
  PayrollRecordOverviewPanel,
  PayrollPayslipPanel,
  PayrollDeductionsPanel,
} from '../../../../../../components/payroll/PayrollDetailTabPanels'
import { getSyncedEmployeeById } from '../../../../../../lib/employeeSyncService'
import {
  deletePayrollLineItem,
  downloadPayslip,
  listPayslips,
  resolvePayrollLineItem,
} from '../../../../../../lib/payrollSyncService'
import { buildPayrollRecordFromLine } from '../../../../../../lib/payrollShared'
import { formatPayrollInr } from '../../../../../../lib/payrollPage'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'payslip', label: 'Payslip' },
  { id: 'deductions', label: 'Deductions' },
]

export default function EmployeePayrollRecordPage() {
  const params = useParams()
  const router = useRouter()
  const employeeProfileHref = `/employees/${params.id}?tab=payroll`
  const [tab, setTab] = useState('overview')
  const [employee, setEmployee] = useState(null)
  const [record, setRecord] = useState(null)
  const [monthLabel, setMonthLabel] = useState('—')
  const [payslipId, setPayslipId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadError('')
        const { employee: employeeRow } = await getSyncedEmployeeById(params.id)

        if (cancelled) return

        if (!employeeRow) {
          setEmployee(null)
          setRecord(null)
          return
        }

        setEmployee(employeeRow)

        const resolvedLine = await resolvePayrollLineItem(params.lineItemId, {
          organizationUserId: employeeRow.membershipId || employeeRow.id,
        })

        if (!resolvedLine) {
          setRecord(null)
          return
        }

        const mapped = buildPayrollRecordFromLine(resolvedLine)
        setRecord(mapped.record)
        setMonthLabel(mapped.monthLabel)

        if (mapped.runId) {
          const slips = await listPayslips({ payrollRunId: mapped.runId })
          const slip = slips.find((row) =>
            [row.payrollLineItemId, row.payrollLineItem?.id, row.payrollLineItem].some(
              (value) => value != null && String(value) === String(resolvedLine.id ?? params.lineItemId),
            ),
          )
          setPayslipId(slip?.id || null)
        } else {
          setPayslipId(null)
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.message || 'Could not load payroll record')
          setRecord(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [params.id, params.lineItemId])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Loading..."
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Employees', href: '/employees' },
            { label: 'Employee', href: employeeProfileHref },
          ]}
          showProfile
        />
        <Card variant="elevated" className="flex justify-center rounded-xl p-12">
          <LoadingSpinner message="Loading payroll record..." />
        </Card>
      </div>
    )
  }

  if (!employee || !record) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Record Not Found"
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Employees', href: '/employees' },
            { label: employee?.name || 'Employee', href: employeeProfileHref },
          ]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Payroll record not found"
            description={
              loadError ||
              'This payroll entry may have been removed or is not linked to this employee.'
            }
            action={
              <Link href={employeeProfileHref} className="text-sm font-medium text-orange-600 hover:underline">
                Back to employee payroll
              </Link>
            }
          />
        </Card>
      </div>
    )
  }

  const totalDeductions = (record.pf || 0) + (record.esi || 0) + (record.pt || 0) + (record.tds || 0)
  const readOnly = ['locked', 'disbursed'].includes(String(record.runStatus || '').toLowerCase())
  const deleteTargetId = record.lineItemPk || record.id

  const handleDelete = async () => {
    try {
      setDeleting(true)
      await deletePayrollLineItem(deleteTargetId)
      setDeleteOpen(false)
      router.push(employeeProfileHref)
    } catch (error) {
      setLoadError(error?.message || 'Failed to remove payroll record')
    } finally {
      setDeleting(false)
    }
  }

  const handleDownloadPayslip = async () => {
    if (!payslipId) return
    try {
      setDownloading(true)
      setDownloadError('')
      await downloadPayslip(payslipId)
    } catch (err) {
      setDownloadError(err?.message || 'Failed to download payslip')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <HRPageHeader
          title={monthLabel}
          subtitle={`${employee.name} · ${employee.designation || record.designation}`}
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Employees', href: '/employees' },
            { label: employee.name, href: `/employees/${employee.id}` },
            { label: 'Payroll', href: employeeProfileHref },
            { label: monthLabel, href: `/employees/${employee.id}/payroll/${params.lineItemId}` },
          ]}
          showProfile
        >
          <HRDetailHeaderActions
            actions={[
              {
                label: 'Employee',
                title: 'View employee profile',
                icon: UserRound,
                onClick: () => router.push(`/employees/${employee.id}`),
              },
              {
                label: 'Edit',
                title: 'Edit payroll record',
                icon: Edit,
                disabled: readOnly,
                onClick: () => router.push(`/payroll/${deleteTargetId}/edit`),
              },
              {
                label: 'Remove',
                title: 'Remove from payroll',
                icon: Trash2,
                variant: 'danger',
                disabled: readOnly,
                onClick: () => setDeleteOpen(true),
              },
            ]}
          />
        </HRPageHeader>

        <EmployeeDetailMetaBar employee={employee} />
        <PayrollDetailMetaBar record={record} month={monthLabel} />
      </div>

      <HRDashboardKpiRow
        stats={[
          {
            title: 'Gross Pay',
            value: formatPayrollInr(record.gross),
            subtitle: monthLabel,
            icon: Wallet,
            colorScheme: 'orange',
          },
          {
            title: 'Deductions',
            value: formatPayrollInr(totalDeductions),
            subtitle: 'PF, ESI, PT, TDS',
            icon: TrendingDown,
            colorScheme: 'orange',
          },
          {
            title: 'Net Pay',
            value: formatPayrollInr(record.net),
            subtitle: record.status,
            icon: Banknote,
            colorScheme: 'orange',
          },
        ]}
        columns="sm:grid-cols-2 lg:grid-cols-3"
      />

      <TabsWithActions tabs={TABS} activeTab={tab} onTabChange={setTab} variant="pill" />

      {tab === 'overview' && <PayrollRecordOverviewPanel record={record} month={monthLabel} />}
      {tab === 'payslip' && (
        <div className="space-y-4">
          <PayrollPayslipPanel record={record} month={monthLabel} />
          {payslipId ? (
            <div className="space-y-2">
              <Button variant="secondary" disabled={downloading} onClick={handleDownloadPayslip}>
                <FileText className="mr-2 h-4 w-4" />
                {downloading ? 'Downloading…' : 'Download Payslip PDF'}
              </Button>
              {downloadError ? <p className="text-sm text-red-600">{downloadError}</p> : null}
            </div>
          ) : null}
        </div>
      )}
      {tab === 'deductions' && <PayrollDeductionsPanel record={record} />}

      <Modal
        isOpen={deleteOpen}
        onClose={() => {
          if (deleting) return
          setDeleteOpen(false)
        }}
        title="Remove from payroll"
        size="sm"
      >
        <p className="text-sm text-gray-600">
          Remove <span className="font-semibold text-gray-900">{monthLabel}</span> payroll for{' '}
          <span className="font-semibold text-gray-900">{employee.name}</span>?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" disabled={deleting} onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="!bg-red-600 hover:!bg-red-700"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Removing…' : 'Remove'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}
