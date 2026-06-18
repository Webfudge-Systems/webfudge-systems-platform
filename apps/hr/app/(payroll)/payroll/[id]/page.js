'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Edit, Mail, Trash2, Wallet, TrendingDown, Banknote, FileText } from 'lucide-react'
import { Button, Modal, TabsWithActions } from '@webfudge/ui'
import HRPageHeader from '../../../../components/layout/HRPageHeader'
import HRModulePage from '../../../../components/layout/HRModulePage'
import HRDashboardKpiRow from '../../../../components/dashboard/HRDashboardKpiRow'
import PayrollDetailMetaBar from '../../../../components/payroll/PayrollDetailMetaBar'
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
      <HRModulePage>
        <p className="text-gray-600">Loading payroll record...</p>
      </HRModulePage>
    )
  }

  if (!record) {
    return (
      <HRModulePage>
        <p className="text-gray-600">Payroll record not found.</p>
        <Link href="/payroll" className="mt-2 inline-block text-sm text-orange-600 hover:underline">
          Back to payroll
        </Link>
      </HRModulePage>
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
    <HRModulePage>
      <div className="space-y-4">
        <HRPageHeader
          title={record.name}
          subtitle={`${record.designation || record.dept} · ${monthLabel}`}
          breadcrumb={[
            { label: 'Payroll', href: '/payroll' },
            { label: record.name, href: `/payroll/${record.id}` },
          ]}
          showSearch
          actions={
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" disabled={readOnly} onClick={() => router.push(`/payroll/${record.id}/edit`)}>
                <Edit className="mr-1 h-4 w-4" />
                Edit
              </Button>
              <Button variant="secondary" size="sm" onClick={() => router.push(`/employees/${record.employeeRefId || record.id}`)}>
                <Mail className="mr-1 h-4 w-4" />
                Employee
              </Button>
              <Button variant="secondary" size="sm" disabled={readOnly} className="!text-red-600 hover:!bg-red-50 disabled:opacity-40" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="mr-1 h-4 w-4" />
                Remove
              </Button>
            </div>
          }
        />

        <PayrollDetailMetaBar record={record} month={monthLabel} />

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
      </div>

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
    </HRModulePage>
  )
}
