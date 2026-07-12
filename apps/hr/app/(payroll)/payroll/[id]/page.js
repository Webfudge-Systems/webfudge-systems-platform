'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, Trash2, Wallet, TrendingDown, Banknote, FileText } from 'lucide-react'
import { Button, Card, EmptyState, LoadingSpinner, Modal, TabsWithActions } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRDashboardKpiRow from '../../../../components/dashboard/HRDashboardKpiRow'
import PayrollDetailMetaBar from '../../../../components/payroll/PayrollDetailMetaBar'
import HRDetailHeaderActions from '../../../../components/shared/HRDetailHeaderActions'
import {
  PayrollRecordOverviewPanel,
  PayrollPayslipPanel,
  PayrollDeductionsPanel,
} from '../../../../components/payroll/PayrollDetailTabPanels'
import {
  deletePayrollLineItem,
  downloadPayslip,
  listPayslips,
  resolvePayrollLineItem,
} from '../../../../lib/payrollSyncService'
import { buildPayrollRecordFromLine } from '../../../../lib/payrollShared'
import { formatPayrollInr } from '../../../../lib/payrollPage'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'payslip', label: 'Payslip' },
  { id: 'deductions', label: 'Deductions' },
]

export default function PayrollRecordPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromEmployee = searchParams.get('from') === 'employee'
  const employeeId = searchParams.get('employeeId')
  const employeeName = searchParams.get('employeeName') || 'Employee'
  const employeeProfileHref = employeeId ? `/employees/${employeeId}?tab=payroll` : null
  const [tab, setTab] = useState('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [record, setRecord] = useState(null)
  const [monthLabel, setMonthLabel] = useState('-')
  const [payslipId, setPayslipId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadError('')
        const line = await resolvePayrollLineItem(params.id)
        if (!line || cancelled) {
          if (!cancelled) setRecord(null)
          return
        }

        const mapped = buildPayrollRecordFromLine(line)
        setRecord(mapped.record)
        setMonthLabel(mapped.monthLabel)

        if (mapped.runId) {
          const slips = await listPayslips({ payrollRunId: mapped.runId })
          const slip = slips.find((row) =>
            [row.payrollLineItemId, row.payrollLineItem?.id, row.payrollLineItem].some(
              (value) => value != null && String(value) === String(line.id ?? params.id),
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
  }, [params.id])

  if (loading) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Loading..."
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="flex justify-center rounded-xl p-12">
          <LoadingSpinner message="Loading payroll record..." />
        </Card>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <HRPageHeader
          title="Record Not Found"
          breadcrumb={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Payroll', href: '/payroll' }]}
          showProfile
        />
        <Card variant="elevated" className="rounded-xl p-12">
          <EmptyState
            title="Payroll record not found"
            description={loadError || 'The record may have been removed or the link is incorrect.'}
            action={<Link href="/payroll" className="text-sm font-medium text-orange-600 hover:underline">Back to payroll</Link>}
          />
        </Card>
      </div>
    )
  }

  const totalDeductions = (record.pf || 0) + (record.esi || 0) + (record.pt || 0) + (record.tds || 0)
  const readOnly = ['locked', 'disbursed'].includes(String(record.runStatus || record.status || '').toLowerCase())
  const deleteTargetId = record.lineItemPk || record.id

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

  const handleDelete = async () => {
    await deletePayrollLineItem(deleteTargetId)
    setDeleteOpen(false)
    if (fromEmployee && employeeProfileHref) {
      router.push(employeeProfileHref)
      return
    }
    router.push('/payroll')
  }

  const breadcrumb = fromEmployee && employeeProfileHref
    ? [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Employees', href: '/employees' },
        { label: employeeName, href: employeeProfileHref },
        { label: monthLabel, href: `/payroll/${record.id}` },
      ]
    : [
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Payroll', href: '/payroll' },
        { label: record.name, href: `/payroll/${record.id}` },
      ]

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <HRPageHeader
          title={record.name}
          subtitle={`${record.designation || record.dept} · ${monthLabel}`}
          breadcrumb={breadcrumb}
          showProfile
        >
          <HRDetailHeaderActions
            actions={[
              {
                label: 'Edit',
                title: 'Edit payroll record',
                icon: Edit,
                disabled: readOnly,
                onClick: () => router.push(`/payroll/${deleteTargetId}/edit`),
              },
              {
                label: 'Employee',
                title: 'View employee profile',
                icon: Mail,
                onClick: () => router.push(employeeProfileHref || `/employees/${record.employeeRefId || record.id}`),
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

      <Modal isOpen={deleteOpen} onClose={() => setDeleteOpen(false)} title="Remove from payroll" size="sm">
        <p className="text-sm text-gray-600">
          Remove <span className="font-semibold text-gray-900">{record.name}</span> from this payroll run?
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" className="!bg-red-600 hover:!bg-red-700" onClick={handleDelete}>
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  )
}
