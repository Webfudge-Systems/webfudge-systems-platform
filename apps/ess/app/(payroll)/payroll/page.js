'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Wallet, TrendingUp, Receipt, Download } from 'lucide-react'
import {
  Button,
  Table,
  TableEmptyBelow,
  TableResultsCount,
} from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSModuleTabBar from '../../../components/layout/ESSModuleTabBar'
import ESSDataTableCard from '../../../components/shared/ESSDataTableCard'
import ESSDashboardKpiRow from '../../../components/dashboard/ESSDashboardKpiRow'
import ESSPayslipView from '../../../components/payroll/ESSPayslipView'
import ESSSalaryBreakdown from '../../../components/payroll/ESSSalaryBreakdown'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import {
  downloadPayslip,
  getSalaryStructureById,
  listEmployeePayrollLineItems,
  listPayslips,
} from '../../../lib/payrollSyncService'
import { mapEmployeePayrollHistoryRow, sortEmployeePayrollHistory } from '../../../lib/payrollShared'
import { formatCurrency } from '../../../lib/pageUtils'

const TAB_KEYS = {
  LATEST: 'latest',
  HISTORY: 'history',
  BREAKDOWN: 'breakdown',
}

export default function PayrollPage() {
  const { employee, membershipId } = useCurrentEmployee()
  const [activeTab, setActiveTab] = useState(TAB_KEYS.LATEST)
  const [history, setHistory] = useState([])
  const [payslips, setPayslips] = useState([])
  const [salaryStructure, setSalaryStructure] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState(null)

  const loadData = useCallback(async () => {
    if (!membershipId) {
      setLoading(false)
      return
    }
    try {
      setLoading(true)
      const [lineItems, payslipRows] = await Promise.all([
        listEmployeePayrollLineItems(membershipId),
        listPayslips({ organizationUserId: membershipId }),
      ])
      setHistory(sortEmployeePayrollHistory(lineItems.map(mapEmployeePayrollHistoryRow)))
      setPayslips(payslipRows)

      if (employee?.salaryStructureId) {
        const structure = await getSalaryStructureById(employee.salaryStructureId)
        setSalaryStructure(structure)
      } else {
        setSalaryStructure(null)
      }
    } finally {
      setLoading(false)
    }
  }, [membershipId, employee?.salaryStructureId])

  useEffect(() => {
    loadData()
  }, [loadData])

  const latest = history[0]
  const latestPayslip = payslips[0]
  const ytdGross = useMemo(
    () => history.reduce((sum, row) => sum + Number(row.gross || 0), 0),
    [history],
  )

  const kpiStats = useMemo(
    () => [
      {
        title: 'Last Net Pay',
        value: latest ? formatCurrency(latest.net) : '—',
        subtitle: latest?.month || 'No payslip yet',
        icon: Wallet,
        colorScheme: 'orange',
        onClick: () => setActiveTab(TAB_KEYS.LATEST),
      },
      {
        title: 'YTD Gross',
        value: formatCurrency(ytdGross),
        subtitle: `${history.length} payslip${history.length === 1 ? '' : 's'}`,
        icon: TrendingUp,
        colorScheme: 'orange',
        onClick: () => setActiveTab(TAB_KEYS.HISTORY),
      },
      {
        title: 'Annual CTC',
        value: formatCurrency(salaryStructure?.annualCtc || employee?.annualCtc),
        subtitle: 'As per HR record',
        icon: Receipt,
        colorScheme: 'orange',
        onClick: () => setActiveTab(TAB_KEYS.BREAKDOWN),
      },
      {
        title: 'Downloads',
        value: String(payslips.length),
        subtitle: 'PDF payslips available',
        icon: Download,
        colorScheme: 'orange',
        onClick: () => setActiveTab(TAB_KEYS.HISTORY),
      },
    ],
    [latest, ytdGross, history.length, salaryStructure, employee, payslips.length],
  )

  const handleDownload = async (payslipId, filename) => {
    if (!payslipId) return
    try {
      setDownloadingId(payslipId)
      await downloadPayslip(payslipId, { filename })
    } finally {
      setDownloadingId(null)
    }
  }

  const historyColumns = [
    { key: 'month', label: 'Month' },
    { key: 'gross', label: 'Gross' },
    { key: 'deductions', label: 'Deductions' },
    { key: 'net', label: 'Net' },
    { key: 'status', label: 'Status' },
    { key: 'download', label: 'Download' },
  ]

  const historyData = history.map((row) => {
    const payslip = payslips.find(
      (p) => p.payrollLineItemId === row.lineItemPk || p.payrollLineItemId === row.id,
    )
    return {
      ...row,
      gross: formatCurrency(row.gross),
      deductions: formatCurrency(row.deductions),
      net: formatCurrency(row.net),
      download: payslip?.id ? (
        <Button
          variant="secondary"
          size="sm"
          disabled={downloadingId === payslip.id}
          onClick={() => handleDownload(payslip.id, `payslip-${row.month}.pdf`)}
        >
          Download
        </Button>
      ) : (
        '—'
      ),
    }
  })

  const tabItems = useMemo(
    () => [
      { key: TAB_KEYS.LATEST, label: 'Latest Payslip', badge: latest ? 1 : 0 },
      { key: TAB_KEYS.HISTORY, label: 'History', badge: history.length },
      {
        key: TAB_KEYS.BREAKDOWN,
        label: 'Salary Breakdown',
        badge: salaryStructure || employee?.annualCtc ? 1 : 0,
      },
    ],
    [latest, history.length, salaryStructure, employee?.annualCtc],
  )

  return (
    <EmployeeGate>
      <ESSModulePage className={`!space-y-6 transition-opacity ${loading ? 'opacity-90' : ''}`}>
        <ESSPageHeader
          title="My Payroll"
          subtitle="View payslips and salary breakdown"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Payroll', href: '/payroll' },
          ]}
          showBack={false}
        />

        <ESSDashboardKpiRow stats={kpiStats} />

        <ESSModuleTabBar tabs={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === TAB_KEYS.LATEST ? (
          <ESSPayslipView
            employee={employee}
            latest={latest}
            payslip={latestPayslip}
            onDownload={handleDownload}
            downloading={downloadingId === latestPayslip?.id}
          />
        ) : null}

        {activeTab === TAB_KEYS.HISTORY ? (
          <div className="space-y-4">
            <TableResultsCount count={historyData.length} />
            <ESSDataTableCard>
              {historyData.length ? (
                <Table variant="modernEmbedded" columns={historyColumns} data={historyData} keyField="id" />
              ) : null}
              {!loading && historyData.length === 0 ? (
                <TableEmptyBelow
                  title="No payslips yet"
                  description="Your payroll history will build as HR processes each cycle."
                />
              ) : null}
            </ESSDataTableCard>
          </div>
        ) : null}

        {activeTab === TAB_KEYS.BREAKDOWN ? (
          <ESSSalaryBreakdown salaryStructure={salaryStructure} employee={employee} />
        ) : null}
      </ESSModulePage>
    </EmployeeGate>
  )
}
