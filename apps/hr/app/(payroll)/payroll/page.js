'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Wallet,
  TrendingDown,
  Banknote,
  FileText,
  Plus,
  Download,
  Landmark,
  CreditCard,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Avatar,
  TableCellText,
  TableCellOrangePill,
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
import {
  PAYROLL_RUN,
  PAYROLL_EMPLOYEES,
  SALARY_STRUCTURES,
  PAYSLIPS,
  COMPLIANCE_ITEMS,
} from '../../../lib/mock-data/payroll'
import {
  computePayrollStats,
  filterPayrollEmployees,
  filterPayslips,
  filterSalaryStructures,
  filterComplianceItems,
  getPayrollTabItems,
} from '../../../lib/payrollPage'

export default function PayrollPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')

  const stats = useMemo(() => computePayrollStats(), [])
  const tabItems = useMemo(() => getPayrollTabItems(), [])

  const employeeRows = useMemo(
    () => filterPayrollEmployees(PAYROLL_EMPLOYEES, searchQuery),
    [searchQuery]
  )

  const payslipRows = useMemo(
    () =>
      filterPayslips(PAYSLIPS, searchQuery).map((row, index) => ({
        ...row,
        id: `ps-${index}`,
      })),
    [searchQuery]
  )

  const structureRows = useMemo(
    () => filterSalaryStructures(SALARY_STRUCTURES, searchQuery),
    [searchQuery]
  )

  const complianceRows = useMemo(
    () => filterComplianceItems(COMPLIANCE_ITEMS, searchQuery),
    [searchQuery]
  )

  const employeeColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="flex min-w-[180px] items-center gap-3">
            <Avatar alt={row.name} fallback={row.name?.charAt(0) || '?'} size="sm" />
            <div className="min-w-0">
              <div className="truncate font-medium text-gray-900">{row.name}</div>
              <div className="truncate text-sm text-gray-500">{row.id}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'dept',
        label: 'DEPARTMENT',
        render: (_, row) => <TableCellOrangePill value={row.dept} />,
      },
      {
        key: 'gross',
        label: 'GROSS',
        render: (_, row) => (
          <TableCellText value={`₹${row.gross.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'pf',
        label: 'PF',
        render: (_, row) => <TableCellText value={`₹${row.pf.toLocaleString('en-IN')}`} />,
      },
      {
        key: 'tds',
        label: 'TDS',
        render: (_, row) => <TableCellText value={`₹${row.tds.toLocaleString('en-IN')}`} />,
      },
      {
        key: 'net',
        label: 'NET',
        render: (_, row) => (
          <TableCellText value={`₹${row.net.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <HRTableRowActions
            onEdit={() => router.push(`/employees/${row.id}`)}
            editTitle="View employee"
            onDelete={() => console.log('Remove from payroll', row.id)}
            deleteTitle="Remove from payroll"
            itemName={row.name}
          />
        ),
      },
    ],
    [router]
  )

  const payslipColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[160px] font-medium text-gray-900">{row.employee}</div>
        ),
      },
      {
        key: 'month',
        label: 'MONTH',
        render: (_, row) => <TableCellText value={row.month} />,
      },
      {
        key: 'gross',
        label: 'GROSS',
        render: (_, row) => (
          <TableCellText value={`₹${row.gross.toLocaleString('en-IN')}`} />
        ),
      },
      {
        key: 'net',
        label: 'NET',
        render: (_, row) => (
          <TableCellText value={`₹${row.net.toLocaleString('en-IN')}`} emphasized />
        ),
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: () => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" size="sm" onClick={() => console.log('Download PDF')}>
              <Download className="mr-1 h-4 w-4" />
              PDF
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const structureColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'STRUCTURE',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[200px]">
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="mt-0.5 text-sm text-gray-500">{row.components}</div>
          </div>
        ),
      },
      {
        key: 'ctc',
        label: 'CTC RANGE',
        render: (_, row) => (
          <TableCellText
            value={`₹${(row.ctcMin / 100000).toFixed(0)}–${(row.ctcMax / 100000).toFixed(0)}L`}
            emphasized
          />
        ),
      },
      {
        key: 'headcount',
        label: 'HEADCOUNT',
        render: (_, row) => <TableCellText value={String(row.headcount)} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <HRTableRowActions
            onEdit={() => console.log('Edit structure', row.id)}
            editTitle="Edit structure"
            onDelete={() => console.log('Delete structure', row.id)}
            deleteTitle="Delete structure"
            itemName={row.name}
          />
        ),
      },
    ],
    []
  )

  const complianceColumns = useMemo(
    () => [
      {
        key: 'name',
        label: 'ITEM',
        fixed: true,
        render: (_, row) => (
          <div className="min-w-[180px] font-medium text-gray-900">{row.name}</div>
        ),
      },
      {
        key: 'amount',
        label: 'AMOUNT',
        render: (_, row) => (
          <TableCellText
            value={row.amount > 0 ? `₹${row.amount.toLocaleString('en-IN')}` : '—'}
            emphasized={row.amount > 0}
          />
        ),
      },
      {
        key: 'dueDate',
        label: 'DUE',
        render: (_, row) => <TableCellText value={row.dueDate} />,
      },
      {
        key: 'status',
        label: 'STATUS',
        render: (_, row) => <HRStatusBadge status={row.status} />,
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: () => (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <Button variant="secondary" size="sm" onClick={() => console.log('Download')}>
              <Download className="mr-1 h-4 w-4" />
              Download
            </Button>
          </div>
        ),
      },
    ],
    []
  )

  const resultCount =
    activeTab === 'overview'
      ? employeeRows.length
      : activeTab === 'structures'
        ? structureRows.length
        : activeTab === 'payslips'
          ? payslipRows.length
          : activeTab === 'compliance'
            ? complianceRows.length
            : 0

  return (
    <HRModulePage>
      <HRPageHeader
        title="Payroll"
        subtitle={`${PAYROLL_RUN.month} run · ${stats.employees} employees · ${stats.runStatus}`}
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Payroll', href: '/payroll' },
        ]}
        showActions
        showSearch
        onImportClick={() => console.log('Import payroll')}
        onExportClick={() => console.log('Export payroll')}
      />

      <HRKpiRow columns={6}>
        <KPICard compact title="Total Gross" value={stats.totalGross} icon={Wallet} colorScheme="orange" />
        <KPICard compact title="Deductions" value={stats.totalDeductions} icon={TrendingDown} colorScheme="orange" />
        <KPICard compact title="Total Net" value={stats.totalNet} icon={Banknote} colorScheme="orange" />
        <KPICard compact title="PF Liability" value={stats.pfLiability} icon={FileText} colorScheme="orange" />
        <KPICard compact title="ESI" value={stats.esiLiability} icon={FileText} colorScheme="orange" />
        <KPICard compact title="TDS" value={stats.tdsLiability} icon={FileText} colorScheme="orange" />
      </HRKpiRow>

      <TabsWithActions
        tabs={tabItems.map((item) => ({
          key: item.key,
          label: item.label,
          badge: item.count > 0 ? String(item.count) : undefined,
        }))}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showSearch
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        showAdd
        onAddClick={() => console.log('Run payroll')}
        addTitle="Run Payroll"
        showFilter
        onFilterClick={() => console.log('Filter payroll')}
        showExport
        onExportClick={() => console.log('Export payroll')}
        exportTitle="Export"
      />

      {activeTab !== 'loans' && <TableResultsCount count={resultCount} />}

      {activeTab === 'overview' && (
        <>
          <HRSectionCard>
            <p className="font-semibold text-gray-900">
              {PAYROLL_RUN.month} Payroll — ₹{(PAYROLL_RUN.gross / 100000).toFixed(2)}L gross ·{' '}
              {PAYROLL_RUN.employees} employees
            </p>
            <p className="mt-1 text-sm text-orange-600">Status: {PAYROLL_RUN.status}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {PAYROLL_RUN.steps.map((s, i) => (
                <span
                  key={s}
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    i <= PAYROLL_RUN.currentStep
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </HRSectionCard>
          <HRDataTableCard>
            <Table
              columns={employeeColumns}
              data={employeeRows}
              keyField="id"
              variant="modern"
              onRowClick={(row) => router.push(`/employees/${row.id}`)}
            />
            {employeeRows.length === 0 && (
              <div className="border-t border-gray-200 p-12 text-center">
                <Wallet className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-semibold text-gray-700">No payroll records found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search.</p>
              </div>
            )}
          </HRDataTableCard>
        </>
      )}

      {activeTab === 'structures' && (
        <>
          <HRDataTableCard>
            <Table columns={structureColumns} data={structureRows} keyField="id" variant="modern" />
            {structureRows.length === 0 && (
              <div className="border-t border-gray-200 p-12 text-center">
                <Landmark className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                <h3 className="mb-2 text-lg font-semibold text-gray-700">No salary structures found</h3>
                <p className="text-sm text-gray-500">Try adjusting your search.</p>
              </div>
            )}
          </HRDataTableCard>
          <Button variant="primary" className="bg-orange-500 hover:bg-orange-600">
            <Plus className="mr-2 h-4 w-4" />
            Create Structure
          </Button>
        </>
      )}

      {activeTab === 'payslips' && (
        <HRDataTableCard>
          <Table columns={payslipColumns} data={payslipRows} keyField="id" variant="modern" />
          {payslipRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No payslips found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'compliance' && (
        <HRDataTableCard>
          <Table columns={complianceColumns} data={complianceRows} keyField="name" variant="modern" />
          {complianceRows.length === 0 && (
            <div className="border-t border-gray-200 p-12 text-center">
              <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <h3 className="mb-2 text-lg font-semibold text-gray-700">No compliance items found</h3>
              <p className="text-sm text-gray-500">Try adjusting your search.</p>
            </div>
          )}
        </HRDataTableCard>
      )}

      {activeTab === 'loans' && (
        <HRSectionCard className="text-center">
          <CreditCard className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-800">Loans & advances</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
            Track employee loans, salary advances, and repayment schedules — connect to payroll for deductions.
          </p>
          <Button variant="primary" className="mt-6 bg-orange-500 hover:bg-orange-600" onClick={() => console.log('Add loan')}>
            <Plus className="mr-2 h-4 w-4" />
            Add loan or advance
          </Button>
        </HRSectionCard>
      )}
    </HRModulePage>
  )
}
