'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Wallet,
  TrendingDown,
  Banknote,
  FileText,
  Plus,
  Download,
  Landmark,
  CreditCard,
  Eye,
  Trash2,
  Edit,
  RefreshCcw,
} from 'lucide-react'
import {
  Button,
  Table,
  KPICard,
  TabsWithActions,
  Select,
  TableCellCreated,
  TableEmptyBelow,
  TableColumnPicker,
  TableSortDropdown,
  useTableColumnPreferences,
  useTableSort,
  Modal,
  LoadingSpinner,
  Badge,
} from '@webfudge/ui'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import HRModulePage from '../../../components/layout/HRModulePage'
import HRKpiRow from '../../../components/layout/HRKpiRow'
import HRDataTableCard, { HRListResultsCount } from '../../../components/shared/HRDataTableCard'
import PayrollRunBanner from '../../../components/payroll/PayrollRunBanner'
import {
  PayrollEmployeeCell,
  PayrollDepartmentCell,
  PayrollAmountCell,
  PayrollStatusBadge,
  PayrollStructureCell,
  PayrollPayslipEmployeeCell,
  PayrollComplianceItemCell,
} from '../../../components/payroll/PayrollTableCells'
import {
  computePayrollStats,
  filterPayrollEmployees,
  filterPayslips,
  filterSalaryStructures,
  filterComplianceItems,
  formatPayrollInr,
  getPayrollTabItems,
} from '../../../lib/payrollPage'
import {
  createPayrollRun,
  deletePayrollLineItem,
  deleteSalaryStructure,
  duplicateSalaryStructure,
  generatePayslip,
  getPayslipDownloadUrl,
  listPayslips,
  listPayrollRuns,
  listSalaryStructures,
  recalculatePayrollRun,
  transitionPayrollRun,
  getPayrollRunById,
} from '../../../lib/payrollSyncService'
import { HR_ROOT_BREADCRUMB } from '../../../lib/pageHeader'

const TABLE_SORT_STORAGE_KEY = 'hr.payroll.overview.tableSort'
const COLUMN_VISIBILITY_STORAGE_KEY = 'hr.payroll.overview.tableColumnVisibility'
const COLUMN_ORDER_STORAGE_KEY = 'hr.payroll.overview.tableColumnOrder'
const COLUMN_WIDTHS_STORAGE_KEY = 'hr.payroll.overview.tableColumnWidths'

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'locked', label: 'Locked' },
  { value: 'disbursed', label: 'Disbursed' },
]

const DEFAULT_COLUMN_WIDTHS = { employee: 260, dept: 160, gross: 120, pf: 100, tds: 100, net: 120, status: 130, actions: 210 }
const MIN_COLUMN_WIDTHS = { actions: 180 }
const TOGGLEABLE_COLUMNS = [
  { key: 'dept', label: 'Department' },
  { key: 'gross', label: 'Gross' },
  { key: 'pf', label: 'PF' },
  { key: 'tds', label: 'TDS' },
  { key: 'net', label: 'Net' },
  { key: 'status', label: 'Status' },
]
const DEFAULT_COLUMN_VISIBILITY = TOGGLEABLE_COLUMNS.reduce((acc, { key }) => ({ ...acc, [key]: true }), {})
const SORT_COLUMN_OPTIONS = [{ key: 'employee', label: 'Employee' }, ...TOGGLEABLE_COLUMNS]
const SORTABLE_KEYS = SORT_COLUMN_OPTIONS.map((c) => c.key)

function sortValue(row, key) {
  if (key === 'employee') return row.name || ''
  if (key === 'dept') return row.dept || ''
  if (key === 'status') return row.status || ''
  return Number(row[key] || 0)
}

function runBannerPayload(run) {
  const status = String(run?.status || 'draft').toLowerCase()
  const currentStep = status === 'draft' ? 0 : status === 'review' ? 1 : status === 'locked' ? 2 : 3
  return {
    month: run?.monthLabel || '-',
    gross: Number(run?.totalGross || 0),
    employees: Number(run?.totalEmployees || 0),
    status,
    steps: ['Review', 'Lock', 'Disburse'],
    currentStep,
  }
}

function lineItemToRow(line, run) {
  const orgUser = line.organizationUser || {}
  const user = orgUser.user || {}
  const profile = line.employeeProfile || {}
  const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || `Member ${orgUser.id || ''}`
  const dept = orgUser?.primaryDepartment?.name || orgUser?.departments?.[0]?.name || '—'
  return {
    id: line.id,
    employeeRefId: orgUser.id,
    employeeId: profile.employeeCode || `WF-${1000 + Number(orgUser.id || 0)}`,
    name,
    designation: profile.designation || line.salaryStructure?.name || '—',
    dept,
    gross: Number(line.gross || 0),
    pf: Number(line.pf || 0),
    tds: Number(line.tds || 0),
    net: Number(line.net || 0),
    status: run?.status || 'draft',
    missingSalaryStructure: Boolean(line.missingSalaryStructure),
    missingBankDetails: Boolean(line.missingBankDetails),
  }
}

export default function PayrollPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get('tab')
    return ['overview', 'structures', 'payslips', 'compliance', 'loans'].includes(tab) ? tab : 'overview'
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortPickerOpen, setSortPickerOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [runs, setRuns] = useState([])
  const [selectedRunId, setSelectedRunId] = useState('')
  const [structures, setStructures] = useState([])
  const [payslips, setPayslips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [lockBlockers, setLockBlockers] = useState([])
  const [runCreateOpen, setRunCreateOpen] = useState(false)
  const [newRunMonth, setNewRunMonth] = useState(String(new Date().getMonth() + 1))
  const [newRunYear, setNewRunYear] = useState(String(new Date().getFullYear()))

  const {
    columnVisibility,
    columnOrder,
    columnPickerOpen,
    setColumnPickerOpen,
    columnDropIndicator,
    toolbarRef,
    setColumnVisible,
    handleColumnDragStart,
    handleColumnDragEnd,
    handleColumnRowDragOver,
    handleColumnListDragLeave,
    handleColumnDrop,
    resetColumnTablePreferences,
    tableResizeProps,
  } = useTableColumnPreferences({
    visibilityStorageKey: COLUMN_VISIBILITY_STORAGE_KEY,
    orderStorageKey: COLUMN_ORDER_STORAGE_KEY,
    widthsStorageKey: COLUMN_WIDTHS_STORAGE_KEY,
    defaultVisibility: DEFAULT_COLUMN_VISIBILITY,
    reorderableKeys: TOGGLEABLE_COLUMNS.map((c) => c.key),
    defaultWidths: DEFAULT_COLUMN_WIDTHS,
    minWidths: MIN_COLUMN_WIDTHS,
  })

  const { sortRules, sortData, bindSortableColumns, hasActiveSort, addSortRule, removeSortRule, setRuleDirection, moveSortRule, clearSort, maxRules: sortMaxRules } = useTableSort({ storageKey: TABLE_SORT_STORAGE_KEY })

  const loadData = useCallback(async (forcedRunId = null) => {
    try {
      setLoading(true)
      setError('')
      const [runsData, structuresData] = await Promise.all([listPayrollRuns(), listSalaryStructures()])
      setRuns(runsData)
      setStructures(structuresData)
      const targetRunId = forcedRunId || selectedRunId || String(runsData[0]?.id || '')
      if (targetRunId) {
        const run = await getPayrollRunById(targetRunId)
        setSelectedRunId(String(run.id))
        setRuns((prev) => prev.map((r) => (String(r.id) === String(run.id) ? run : r)))
        setPayslips(await listPayslips({ payrollRunId: run.id }))
      } else {
        setSelectedRunId('')
        setPayslips([])
      }
    } catch (err) {
      setError(err?.message || 'Failed to load payroll')
    } finally {
      setLoading(false)
    }
  }, [selectedRunId])

  useEffect(() => { loadData() }, [loadData])
  useEffect(() => {
    const t = searchParams.get('tab')
    if (t && ['overview', 'structures', 'payslips', 'compliance', 'loans'].includes(t)) {
      setActiveTab(t)
    }
  }, [searchParams])

  const selectedRun = useMemo(() => runs.find((r) => String(r.id) === String(selectedRunId)) || null, [runs, selectedRunId])
  const lineItems = useMemo(() => (selectedRun?.lineItems || []).map((line) => lineItemToRow(line, selectedRun)), [selectedRun])
  const employeeRows = useMemo(() => filterPayrollEmployees(lineItems, { search: searchQuery, status: statusFilter }), [lineItems, searchQuery, statusFilter])
  const sortedEmployeeRows = useMemo(() => sortData(employeeRows, (row, key) => sortValue(row, key)), [employeeRows, sortData])
  const structureRows = useMemo(() => filterSalaryStructures(structures, searchQuery), [structures, searchQuery])
  const payslipRows = useMemo(() => filterPayslips(payslips, searchQuery), [payslips, searchQuery])
  const complianceRows = useMemo(() => filterComplianceItems([], searchQuery), [searchQuery])
  const stats = useMemo(() => computePayrollStats(selectedRun || {}, selectedRun || {}), [selectedRun])
  const tabItems = useMemo(
    () => getPayrollTabItems({ overview: lineItems.length, structures: structures.length, payslips: payslips.length, compliance: 0 }),
    [lineItems.length, structures.length, payslips.length],
  )
  const readOnlyRun = ['locked', 'disbursed'].includes(String(selectedRun?.status || '').toLowerCase())

  const transition = async (action) => {
    if (!selectedRun) return
    try {
      setActionError('')
      setLockBlockers([])
      await transitionPayrollRun(selectedRun.id, action)
      await loadData(selectedRun.id)
    } catch (err) {
      if (action === 'lock') setLockBlockers(err?.details?.blockers || [])
      setActionError(err?.message || 'Action failed')
    }
  }

  const overviewColumns = useMemo(
    () => [
      { key: 'employee', label: 'EMPLOYEE', fixed: true, render: (_, row) => <PayrollEmployeeCell row={row} /> },
      { key: 'dept', visibilityKey: 'dept', label: 'DEPARTMENT', render: (_, row) => <PayrollDepartmentCell department={row.dept} /> },
      { key: 'gross', visibilityKey: 'gross', label: 'GROSS', render: (_, row) => <PayrollAmountCell value={row.gross} emphasized /> },
      { key: 'pf', visibilityKey: 'pf', label: 'PF', render: (_, row) => <PayrollAmountCell value={row.pf} /> },
      { key: 'tds', visibilityKey: 'tds', label: 'TDS', render: (_, row) => <PayrollAmountCell value={row.tds} /> },
      { key: 'net', visibilityKey: 'net', label: 'NET', render: (_, row) => <PayrollAmountCell value={row.net} emphasized /> },
      {
        key: 'status',
        visibilityKey: 'status',
        label: 'STATUS',
        render: (_, row) => (
          <PayrollStatusBadge
            status={row.missingSalaryStructure ? 'Missing Structure' : row.missingBankDetails ? 'Missing Bank' : row.status}
          />
        ),
      },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        width: 210,
        resizable: false,
        render: (_, row) => (
          <div className="flex min-w-[190px] shrink-0 items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="p-2 text-emerald-600 hover:bg-emerald-50" onClick={() => router.push(`/payroll/${row.id}`)}><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-orange-600 hover:bg-orange-50 disabled:opacity-40" disabled={readOnlyRun} onClick={() => router.push(`/payroll/${row.id}/edit`)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-red-600 hover:bg-red-50 disabled:opacity-40" disabled={readOnlyRun} onClick={async () => { await deletePayrollLineItem(row.id); await loadData(selectedRun.id) }}><Trash2 className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-blue-600 hover:bg-blue-50" onClick={async () => { await generatePayslip({ payrollRunId: selectedRun.id, payrollLineItemId: row.id }); await loadData(selectedRun.id) }}><Download className="h-4 w-4" /></Button>
          </div>
        ),
      },
    ],
    [router, readOnlyRun, selectedRun, loadData],
  )

  const visibleOverviewColumns = useMemo(() => {
    const byKey = Object.fromEntries(overviewColumns.map((c) => [c.key, c]))
    const out = []
    if (byKey.employee) out.push(byKey.employee)
    for (const key of columnOrder) {
      const col = byKey[key]
      if (!col?.visibilityKey || !columnVisibility[col.visibilityKey]) continue
      out.push(col)
    }
    if (byKey.actions) out.push(byKey.actions)
    return bindSortableColumns(out, SORTABLE_KEYS)
  }, [overviewColumns, columnOrder, columnVisibility, bindSortableColumns])

  const structureColumns = useMemo(
    () => [
      { key: 'name', label: 'STRUCTURE', fixed: true, render: (_, row) => <PayrollStructureCell row={{ ...row, ctcMin: row.ctc, ctcMax: row.ctc }} /> },
      { key: 'ctc', label: 'CTC', render: (_, row) => <span className="text-sm font-semibold tabular-nums text-gray-900">{formatPayrollInr(row.ctc)}</span> },
      { key: 'headcount', label: 'HEADCOUNT', render: (_, row) => <span className="text-sm text-gray-900">{row.headcount || 0}</span> },
      { key: 'components', label: 'BREAKDOWN', render: (_, row) => <span className="text-xs text-gray-700">Basic {row.basicPercent}% · HRA {row.hraPercent}% · Special {row.specialAllowancePercent}% · FBP {row.fbpPercent}%</span> },
      {
        key: 'actions',
        label: 'ACTIONS',
        fixed: true,
        render: (_, row) => (
          <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="sm" className="p-2 text-emerald-600 hover:bg-emerald-50" onClick={() => router.push(`/payroll/structures/${row.id}`)}><Eye className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-orange-600 hover:bg-orange-50" onClick={() => router.push(`/payroll/structures/${row.id}/edit`)}><Edit className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-blue-600 hover:bg-blue-50" onClick={async () => { await duplicateSalaryStructure(row.id); await loadData(selectedRun?.id) }}><Plus className="h-4 w-4" /></Button>
            <Button variant="ghost" size="sm" className="p-2 text-red-600 hover:bg-red-50" onClick={async () => { await deleteSalaryStructure(row.id); await loadData(selectedRun?.id) }}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ),
      },
    ],
    [router, selectedRun, loadData],
  )

  const payslipColumns = useMemo(
    () => [
      {
        key: 'employee',
        label: 'EMPLOYEE',
        fixed: true,
        render: (_, row) => {
          const user = row.organizationUser?.user || {}
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || user.email || 'Employee'
          return <PayrollPayslipEmployeeCell row={{ name, employeeId: row.organizationUser?.id }} />
        },
      },
      { key: 'generatedAt', label: 'GENERATED', render: (_, row) => <TableCellCreated dateString={row.generatedAt} /> },
      { key: 'status', label: 'STATUS', render: () => <PayrollStatusBadge status="Generated" /> },
      { key: 'actions', label: 'ACTIONS', fixed: true, render: (_, row) => <div className="flex justify-end"><Button variant="secondary" size="sm" onClick={() => window.open(getPayslipDownloadUrl(row.id), '_blank')}><Download className="mr-1 h-4 w-4" />Download</Button></div> },
    ],
    [],
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

  if (loading) {
    return (
      <HRModulePage>
        <div className="py-16"><LoadingSpinner size="lg" message="Loading payroll..." /></div>
      </HRModulePage>
    )
  }

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title="Payroll"
        subtitle={`${selectedRun?.monthLabel || 'No run selected'} · ${stats.employees} employees · ${String(stats.runStatus || '').toUpperCase()}`}
        breadcrumb={[HR_ROOT_BREADCRUMB, { label: 'Payroll', href: '/payroll' }]}
        showProfile
        showActions
      />

      <HRKpiRow>
        <KPICard title="Total Gross" value={stats.totalGross} subtitle={`${stats.employees} employees · ${stats.month}`} icon={Wallet} colorScheme="orange" />
        <KPICard title="Deductions" value={stats.totalDeductions} subtitle="PF, ESI, PT, TDS" icon={TrendingDown} colorScheme="orange" />
        <KPICard title="Total Net" value={stats.totalNet} subtitle={`Run status: ${stats.runStatus}`} icon={Banknote} colorScheme="orange" />
        <KPICard title="PF Liability" value={stats.pfLiability} subtitle="Provident fund contribution" icon={FileText} colorScheme="orange" />
      </HRKpiRow>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
        <div className="w-full max-w-xs">
          <Select
            label="Payroll run"
            value={selectedRunId}
            onChange={async (v) => {
              setSelectedRunId(v)
              await loadData(v)
            }}
            options={runs.map((r) => ({ value: String(r.id), label: `${r.monthLabel} · ${r.status}` }))}
          />
        </div>
        <Button variant="secondary" onClick={() => setRunCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Run Payroll
        </Button>
        {selectedRun?.status === 'draft' ? (
          <Button variant="outline" onClick={async () => { await recalculatePayrollRun(selectedRun.id); await loadData(selectedRun.id) }}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Recalculate
          </Button>
        ) : null}
      </div>

      <div className="relative" ref={toolbarRef}>
        <TabsWithActions
          tabs={tabItems.map((item) => ({ key: item.key, label: item.label, badge: String(item.count) }))}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          showSearch={activeTab !== 'loans'}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder={activeTab === 'overview' ? 'Search payroll records...' : activeTab === 'structures' ? 'Search structures...' : activeTab === 'payslips' ? 'Search payslips...' : 'Search compliance...'}
          showAdd={activeTab === 'overview' || activeTab === 'structures'}
          onAddClick={() => (activeTab === 'structures' ? router.push('/payroll/structures/new') : router.push('/payroll/new'))}
          addTitle={activeTab === 'structures' ? 'Create Structure' : 'Add to Payroll'}
          showFilter={activeTab === 'overview'}
          onFilterClick={() => setFilterOpen(true)}
          hasActiveFilters={Boolean(statusFilter)}
          filterTitle={statusFilter ? 'Status filter active' : 'Filter payroll'}
          showColumnVisibility={activeTab === 'overview'}
          onColumnVisibilityClick={() => {
            setSortPickerOpen(false)
            setColumnPickerOpen((open) => !open)
          }}
          columnVisibilityTitle="Show or hide columns"
          showSort={activeTab === 'overview'}
          onSortClick={() => {
            setColumnPickerOpen(false)
            setSortPickerOpen((open) => !open)
          }}
          hasActiveSort={hasActiveSort}
          sortTitle="Sort payroll (Shift+click headers for multi-sort)"
          variant="glass"
        />
        <TableSortDropdown open={sortPickerOpen && activeTab === 'overview'} sortRules={sortRules} columnOptions={SORT_COLUMN_OPTIONS} onAddRule={addSortRule} onRemoveRule={removeSortRule} onSetDirection={setRuleDirection} onMoveRule={moveSortRule} onClear={clearSort} maxRules={sortMaxRules} />
        <TableColumnPicker
          open={columnPickerOpen && activeTab === 'overview'}
          description="Employee name and actions stay visible. Drag column edges in the table to resize."
          reorderableRows={TOGGLEABLE_COLUMNS}
          columnVisibility={columnVisibility}
          columnOrder={columnOrder}
          columnDropIndicator={columnDropIndicator}
          onSetVisible={setColumnVisible}
          onDragStart={handleColumnDragStart}
          onDragEnd={handleColumnDragEnd}
          onRowDragOver={handleColumnRowDragOver}
          onListDragLeave={handleColumnListDragLeave}
          onDrop={handleColumnDrop}
          onReset={resetColumnTablePreferences}
        />
      </div>

      {activeTab !== 'loans' ? <HRListResultsCount count={resultCount} /> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {actionError ? <p className="text-sm text-red-600">{actionError}</p> : null}
      {lockBlockers.length > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">Cannot lock this run. Missing data for:</p>
          <ul className="mt-2 space-y-1 text-sm text-red-700">
            {lockBlockers.map((b) => (
              <li key={b.lineItemId} className="flex items-center gap-2">
                <span>{b.employeeName}</span>
                {b.missingSalaryStructure ? <Badge variant="danger">Missing structure</Badge> : null}
                {b.missingBankDetails ? <Badge variant="danger">Missing bank</Badge> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {activeTab === 'overview' ? (
        <div className="space-y-4">
          {selectedRun ? (
            <PayrollRunBanner
              run={runBannerPayload(selectedRun)}
              onReview={() => transition('review')}
              onLock={() => transition('lock')}
              onDisburse={() => transition('disburse')}
              onRecalculate={async () => {
                await recalculatePayrollRun(selectedRun.id)
                await loadData(selectedRun.id)
              }}
            />
          ) : null}
          <HRDataTableCard>
            <Table columns={visibleOverviewColumns} data={sortedEmployeeRows} keyField="id" variant="modernEmbedded" {...tableResizeProps} onRowClick={(row) => router.push(`/payroll/${row.id}`)} />
            {employeeRows.length === 0 ? <TableEmptyBelow icon={Wallet} title="No payroll records found" description="Create a payroll run to compute salaries for your employees." action={<Button variant="primary" onClick={() => setRunCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Run Payroll</Button>} /> : null}
          </HRDataTableCard>
        </div>
      ) : null}

      {activeTab === 'structures' ? (
        <HRDataTableCard>
          <Table columns={structureColumns} data={structureRows} keyField="id" variant="modernEmbedded" onRowClick={(row) => router.push(`/payroll/structures/${row.id}`)} />
          {structureRows.length === 0 ? <TableEmptyBelow icon={Landmark} title="No salary structures found" description="Create a structure to start payroll computation." action={<Button variant="primary" onClick={() => router.push('/payroll/structures/new')}><Plus className="mr-2 h-4 w-4" />Create Structure</Button>} /> : null}
        </HRDataTableCard>
      ) : null}

      {activeTab === 'payslips' ? (
        <HRDataTableCard>
          <Table columns={payslipColumns} data={payslipRows} keyField="id" variant="modernEmbedded" />
          {payslipRows.length === 0 ? <TableEmptyBelow icon={FileText} title="No payslips found" description="Generate a payslip from an employee payroll row." /> : null}
        </HRDataTableCard>
      ) : null}

      {activeTab === 'compliance' ? (
        <HRDataTableCard>
          <Table columns={[{ key: 'name', label: 'ITEM', fixed: true, render: (_, row) => <PayrollComplianceItemCell name={row.name} /> }]} data={complianceRows} keyField="name" variant="modernEmbedded" />
          {complianceRows.length === 0 ? <TableEmptyBelow icon={FileText} title="Compliance module pending" description="Compliance filings are intentionally out of scope for this phase." /> : null}
        </HRDataTableCard>
      ) : null}

      {activeTab === 'loans' ? (
        <HRDataTableCard>
          <TableEmptyBelow icon={CreditCard} title="Loans & Advances coming soon" description="This tab is planned for a future release." />
        </HRDataTableCard>
      ) : null}

      <Modal isOpen={filterOpen} onClose={() => setFilterOpen(false)} title="Filter Payroll" size="md">
        <div className="space-y-5">
          <Select label="Run status" value={statusFilter} onChange={setStatusFilter} options={STATUS_OPTIONS} />
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setStatusFilter('')}>Clear</Button>
            <Button onClick={() => setFilterOpen(false)}>Apply Filters</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={runCreateOpen} onClose={() => setRunCreateOpen(false)} title="Run Payroll" size="md">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Month"
              value={newRunMonth}
              onChange={setNewRunMonth}
              options={Array.from({ length: 12 }, (_, idx) => ({ value: String(idx + 1), label: new Date(2026, idx, 1).toLocaleString('en-US', { month: 'long' }) }))}
            />
            <Select
              label="Year"
              value={newRunYear}
              onChange={setNewRunYear}
              options={Array.from({ length: 6 }, (_, idx) => {
                const year = new Date().getFullYear() - 2 + idx
                return { value: String(year), label: String(year) }
              })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={() => setRunCreateOpen(false)}>Cancel</Button>
            <Button onClick={async () => {
              const run = await createPayrollRun({ month: Number(newRunMonth), year: Number(newRunYear) })
              setRunCreateOpen(false)
              await loadData(run?.id)
            }}>
              Create Run
            </Button>
          </div>
        </div>
      </Modal>
    </HRModulePage>
  )
}
