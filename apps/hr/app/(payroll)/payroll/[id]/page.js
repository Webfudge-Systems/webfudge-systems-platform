'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  getPayrollLineItemById,
  getPayslipDownloadUrl,
  listPayslips,
} from '../../../../lib/payrollSyncService'
import { formatPayrollInr } from '../../../../lib/payrollPage'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'payslip', label: 'Payslip' },
  { id: 'deductions', label: 'Deductions' },
]

export default function PayrollRecordPage() {
  const params = useParams()
  const router = useRouter()
  const [tab, setTab] = useState('overview')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [record, setRecord] = useState(null)
  const [monthLabel, setMonthLabel] = useState('-')
  const [payslipId, setPayslipId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const line = await getPayrollLineItemById(params.id)
        if (!line || cancelled) return

        const orgUser = line.organizationUser || {}
        const user = orgUser.user || {}
        const profile = line.employeeProfile || {}
        const run = line.payrollRun || {}
        const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || `Member ${orgUser.id || ''}`
        const dept = orgUser?.primaryDepartment?.name || orgUser?.departments?.[0]?.name || '—'

        setRecord({
          id: line.id,
          employeeRefId: orgUser.id,
          employeeId: profile.employeeCode || `WF-${1000 + Number(orgUser.id || 0)}`,
          name,
          designation: profile.designation || line.salaryStructure?.name || '—',
          dept,
          gross: Number(line.gross || 0),
          pf: Number(line.pf || 0),
          esi: Number(line.esi || 0),
          pt: Number(line.pt || 0),
          tds: Number(line.tds || 0),
          net: Number(line.net || 0),
          status: run.status || 'draft',
        })

        if (run.month && run.year) {
          setMonthLabel(
            new Date(run.year, run.month - 1, 1).toLocaleString('en-US', {
              month: 'long',
              year: 'numeric',
            }),
          )
        }
        const slips = await listPayslips({ payrollRunId: run.id })
        const slip = slips.find((s) => String(s.payrollLineItem?.id || s.payrollLineItem) === String(line.id))
        setPayslipId(slip?.id || null)
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
            description="The record may have been removed or the link is incorrect."
            action={<Link href="/payroll" className="text-sm font-medium text-orange-600 hover:underline">Back to payroll</Link>}
          />
        </Card>
      </div>
    )
  }

  const totalDeductions = (record.pf || 0) + (record.esi || 0) + (record.pt || 0) + (record.tds || 0)
  const readOnly = ['locked', 'disbursed'].includes(String(record.status).toLowerCase())

  const handleDelete = async () => {
    await deletePayrollLineItem(record.id)
    setDeleteOpen(false)
    router.push('/payroll')
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="space-y-3">
        <HRPageHeader
          title={record.name}
          subtitle={`${record.designation || record.dept} · ${monthLabel}`}
          breadcrumb={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Payroll', href: '/payroll' },
            { label: record.name, href: `/payroll/${record.id}` },
          ]}
          showProfile
        >
          <HRDetailHeaderActions
            actions={[
              {
                label: 'Edit',
                title: 'Edit payroll record',
                icon: Edit,
                disabled: readOnly,
                onClick: () => router.push(`/payroll/${record.id}/edit`),
              },
              {
                label: 'Employee',
                title: 'View employee',
                icon: Mail,
                onClick: () => router.push(`/employees/${record.employeeRefId || record.id}`),
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
            <Button variant="secondary" onClick={() => window.open(getPayslipDownloadUrl(payslipId), '_blank')}>
              <FileText className="mr-2 h-4 w-4" />
              Download Payslip PDF
            </Button>
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
