export function computePayrollStats(summary = {}, run = {}) {
  const formatL = (n) => `₹${(n / 100000).toFixed(1)}L`
  const formatK = (n) => `₹${(n / 1000).toFixed(0)}K`

  return {
    month: run.monthLabel || run.month || '',
    employees: Number(summary.totalEmployees || run.totalEmployees || 0),
    runStatus: run.status || 'draft',
    totalGross: formatL(Number(summary.totalGross || run.totalGross || 0)),
    totalDeductions: formatK(Number(summary.totalDeductions || run.totalDeductions || 0)),
    totalNet: formatL(Number(summary.totalNet || run.totalNet || 0)),
    pfLiability: formatK(Number(summary.pfLiability || run.pfLiability || 0)),
    esiLiability: formatK(Number(summary.esiLiability || 0)),
    tdsLiability: formatK(Number(summary.tdsLiability || 0)),
    ptLiability: formatK(Number(summary.ptLiability || 0)),
    draftCount: Number(summary.draftCount || 0),
  }
}

export function getPayrollTabItems(counts = {}) {
  return [
    { key: 'overview', label: 'Overview', count: Number(counts.overview || 0) },
    { key: 'structures', label: 'Salary Structures', count: Number(counts.structures || 0) },
    { key: 'payslips', label: 'Payslips', count: Number(counts.payslips || 0) },
    { key: 'compliance', label: 'Compliance', count: Number(counts.compliance || 0) },
    { key: 'loans', label: 'Loans & Advances', count: 0 },
  ]
}

export function getPayrollOverviewTabItems(rows = []) {
  const readyCount = rows.filter((row) => !row.missingSalaryStructure && !row.missingBankDetails).length
  const missingStructureCount = rows.filter((row) => row.missingSalaryStructure).length
  const missingBankCount = rows.filter((row) => row.missingBankDetails).length

  return [
    { key: 'all', label: 'All Employees', count: rows.length },
    { key: 'ready', label: 'Ready', count: readyCount },
    { key: 'missing-structure', label: 'Missing Structure', count: missingStructureCount },
    { key: 'missing-bank', label: 'Missing Bank', count: missingBankCount },
  ]
}

export function matchesPayrollOverviewTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'ready') return !row.missingSalaryStructure && !row.missingBankDetails
  if (tabKey === 'missing-structure') return row.missingSalaryStructure
  if (tabKey === 'missing-bank') return row.missingBankDetails
  return true
}

export function getSalaryStructureSplitTotal(structure = {}) {
  return (
    Number(structure.basicPercent || 0) +
    Number(structure.hraPercent || 0) +
    Number(structure.specialAllowancePercent || 0) +
    Number(structure.fbpPercent || 0)
  )
}

export function salaryStructureHasValidSplit(structure = {}) {
  return getSalaryStructureSplitTotal(structure) === 100
}

export function getSalaryStructureTabItems(structures = []) {
  const stats = computeSalaryStructureStats(structures)
  return [
    { key: 'all', label: 'All Structures', count: stats.total },
    { key: 'active', label: 'Active', count: stats.active },
    { key: 'in-use', label: 'In Use', count: stats.inUse },
    { key: 'unassigned', label: 'Unassigned', count: stats.unassigned },
    { key: 'invalid-split', label: 'Invalid Split', count: stats.invalidSplit },
  ]
}

export function computeSalaryStructureStats(structures = []) {
  const total = structures.length
  const active = structures.filter((row) => row.isActive !== false).length
  const inUse = structures.filter((row) => Number(row.headcount || 0) > 0).length
  const unassigned = structures.filter((row) => Number(row.headcount || 0) === 0).length
  const invalidSplit = structures.filter((row) => !salaryStructureHasValidSplit(row)).length
  const assignedEmployees = structures.reduce((sum, row) => sum + Number(row.headcount || 0), 0)

  return { total, active, inUse, unassigned, invalidSplit, assignedEmployees }
}

export function matchesSalaryStructureTab(structure, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'active') return structure.isActive !== false
  if (tabKey === 'in-use') return Number(structure.headcount || 0) > 0
  if (tabKey === 'unassigned') return Number(structure.headcount || 0) === 0
  if (tabKey === 'invalid-split') return !salaryStructureHasValidSplit(structure)
  return true
}

export function filterPayrollEmployees(employees, { search = '', status = '' } = {}) {
  const q = search.toLowerCase().trim()
  return employees.filter((e) => {
    if (status && e.status !== status) return false
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      (e.dept || e.department || '').toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q) ||
      (e.employeeId || '').toLowerCase().includes(q)
    )
  })
}

export function filterPayslips(rows, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return rows
  return rows.filter((row) => {
    const haystack = [
      row.name,
      row.employeeId,
      row.payslipNumber,
      row.status,
      row.dept,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function payslipLineItemIds(payslips = []) {
  return new Set(
    payslips
      .map((payslip) => {
        if (payslip.payrollLineItemId != null) return String(payslip.payrollLineItemId)
        const lineItem = payslip.payrollLineItem
        if (lineItem == null) return ''
        if (typeof lineItem === 'object') return String(lineItem.id ?? lineItem.documentId ?? '')
        return String(lineItem)
      })
      .filter(Boolean),
  )
}

export function getPayslipGenerationStatus({ payslips = [], lineItems = [] } = {}) {
  const stats = computePayslipStats(payslips, lineItems)

  if (stats.employeesInRun === 0) {
    return {
      kind: 'no-employees',
      message:
        'No employees are loaded in this payroll run yet. Use Recalculate in the payroll run toolbar to pull employees from your roster, then generate payslips here.',
      canGenerate: false,
      stats,
    }
  }

  if (stats.generated > 0 && stats.pending === 0) {
    return {
      kind: 'all-generated',
      message: `All ${stats.generated} employee${stats.generated === 1 ? '' : 's'} in this run already have payslips. View them in the Generated tab on this page.`,
      canGenerate: false,
      stats,
    }
  }

  return {
    kind: 'pending',
    message: `${stats.pending} employee${stats.pending === 1 ? '' : 's'} still need payslips for this run.`,
    canGenerate: stats.pending > 0,
    stats,
  }
}

export function computePayslipStats(payslips = [], lineItems = []) {
  const generatedIds = payslipLineItemIds(payslips)
  const pending = lineItems.filter(
    (lineItem) => !generatedIds.has(String(lineItem.id)) && !lineItem.payslipGeneratedAt,
  )
  return {
    total: payslips.length + pending.length,
    generated: payslips.length,
    pending: pending.length,
    employeesInRun: lineItems.length,
  }
}

export function getPayslipTabItems(stats = {}) {
  return [
    { key: 'all', label: 'All', count: Number(stats.total || 0) },
    { key: 'generated', label: 'Generated', count: Number(stats.generated || 0) },
    { key: 'pending', label: 'Pending', count: Number(stats.pending || 0) },
  ]
}

export function matchesPayslipTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'generated') return row.rowType === 'generated'
  if (tabKey === 'pending') return row.rowType === 'pending'
  return true
}

export function buildPayslipTableRows(payslips = [], lineItems = []) {
  const lineItemById = Object.fromEntries(lineItems.map((lineItem) => [String(lineItem.id), lineItem]))
  const generatedIds = payslipLineItemIds(payslips)
  const generatedRows = payslips.map((payslip) => {
    const lineItemId = String(
      payslip.payrollLineItemId ??
        payslip.payrollLineItem?.id ??
        payslip.payrollLineItem ??
        '',
    )
    const lineItemRow = lineItemById[lineItemId]
    const orgUser = payslip.organizationUser || {}
    const user = orgUser.user || {}
    const profile = payslip.payrollLineItem?.employeeProfile || {}
    const line = payslip.payrollLineItem || {}
    const name =
      `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
      user.username ||
      user.email ||
      lineItemRow?.name ||
      'Employee'
    return {
      id: String(payslip.id),
      rowType: 'generated',
      name,
      employeeId:
        profile.employeeCode ||
        lineItemRow?.employeeId ||
        `WF-${1000 + Number(orgUser.id || 0)}`,
      dept:
        orgUser?.primaryDepartment?.name ||
        orgUser?.departments?.[0]?.name ||
        lineItemRow?.dept ||
        '—',
      payslipNumber: payslip.payslipNumber || '—',
      generatedAt: payslip.generatedAt || payslip.createdAt || null,
      net: Number(line.net ?? lineItemRow?.net ?? 0),
      status: 'Generated',
      payrollLineItemId: lineItemId || line.id,
      payslipId: payslip.id,
    }
  })

  const pendingRows = lineItems
    .filter((lineItem) => !generatedIds.has(String(lineItem.id)) && !lineItem.payslipGeneratedAt)
    .map((lineItem) => ({
      id: `pending-${lineItem.id}`,
      rowType: 'pending',
      name: lineItem.name,
      employeeId: lineItem.employeeId,
      dept: lineItem.dept,
      payslipNumber: '—',
      generatedAt: null,
      net: Number(lineItem.net || 0),
      status: 'Pending',
      payrollLineItemId: lineItem.id,
      payslipId: null,
    }))

  return [...generatedRows, ...pendingRows]
}

export function payslipSortValue(row, key) {
  if (key === 'employee') return row.name || ''
  if (key === 'payslipNumber') return row.payslipNumber || ''
  if (key === 'generatedAt') return row.generatedAt || ''
  if (key === 'net') return Number(row.net || 0)
  if (key === 'status') return row.status || ''
  if (key === 'dept') return row.dept || ''
  return row[key]
}

export function filterSalaryStructures(structures, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return structures
  return structures.filter(
    (s) =>
      s.name.toLowerCase().includes(q) ||
      JSON.stringify(s.components || '').toLowerCase().includes(q)
  )
}

export function formatPayrollInr(amount) {
  return `₹${Number(amount).toLocaleString('en-IN')}`
}

export function filterComplianceItems(items, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return items
  return items.filter((row) => {
    const haystack = [row.name, row.authority, row.status, row.reference, row.period, row.type]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

const COMPLIANCE_OBLIGATIONS = [
  { id: 'pf', name: 'Provident Fund (PF)', authority: 'EPFO', amountKey: 'pfLiability', type: 'Statutory' },
  { id: 'esi', name: 'Employee State Insurance (ESI)', authority: 'ESIC', amountKey: 'esiLiability', type: 'Statutory' },
  { id: 'pt', name: 'Professional Tax (PT)', authority: 'State Govt.', amountKey: 'ptLiability', type: 'Statutory' },
  { id: 'tds', name: 'Tax Deducted at Source (TDS)', authority: 'Income Tax Dept.', amountKey: 'tdsLiability', type: 'Statutory' },
]

function inferComplianceStatus(run, amount, filing = {}) {
  if (filing.status) return filing.status
  if (amount <= 0) return 'Not applicable'
  const runStatus = String(run?.status || 'draft').toLowerCase()
  if (runStatus === 'locked' || runStatus === 'disbursed') return 'Ready'
  return 'Pending'
}

function sumLineAmount(lines, field) {
  return lines.reduce((sum, line) => sum + Number(line?.[field] || 0), 0)
}

function complianceAmounts(selectedRun, sourceLines = []) {
  const pfFromLines = sumLineAmount(sourceLines, 'pf')
  return {
    pfLiability: pfFromLines || Number(selectedRun?.pfLiability || 0),
    esiLiability: sumLineAmount(sourceLines, 'esi'),
    ptLiability: sumLineAmount(sourceLines, 'pt'),
    tdsLiability: sumLineAmount(sourceLines, 'tds'),
  }
}

export function buildComplianceRows(selectedRun, filings = {}, sourceLines = []) {
  if (!selectedRun?.id) return []
  const amounts = complianceAmounts(selectedRun, sourceLines)
  return COMPLIANCE_OBLIGATIONS.map(({ id, name, authority, amountKey, type }) => {
    const amount = Number(amounts[amountKey] || 0)
    const filing = filings[id] || {}
    return {
      id,
      name,
      authority,
      type,
      amount,
      period: selectedRun.monthLabel || '—',
      status: inferComplianceStatus(selectedRun, amount, filing),
      reference: filing.reference || '',
      filedAt: filing.filedAt || null,
      notes: filing.notes || '',
    }
  })
}

export function computeComplianceStats(rows = []) {
  const applicable = rows.filter((row) => row.status !== 'Not applicable')
  return {
    total: rows.length,
    applicable: applicable.length,
    pending: applicable.filter((row) => row.status === 'Pending').length,
    ready: applicable.filter((row) => row.status === 'Ready').length,
    filed: applicable.filter((row) => row.status === 'Filed').length,
    notApplicable: rows.filter((row) => row.status === 'Not applicable').length,
    totalLiability: applicable.reduce((sum, row) => sum + Number(row.amount || 0), 0),
  }
}

export function getComplianceTabItems(stats = {}) {
  return [
    { key: 'all', label: 'All', count: Number(stats.total || 0) },
    { key: 'pending', label: 'Pending', count: Number(stats.pending || 0) },
    { key: 'ready', label: 'Ready', count: Number(stats.ready || 0) },
    { key: 'filed', label: 'Filed', count: Number(stats.filed || 0) },
  ]
}

export function matchesComplianceTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'pending') return row.status === 'Pending'
  if (tabKey === 'ready') return row.status === 'Ready'
  if (tabKey === 'filed') return row.status === 'Filed'
  return true
}

export function complianceSortValue(row, key) {
  if (key === 'item') return row.name || ''
  if (key === 'authority') return row.authority || ''
  if (key === 'amount') return Number(row.amount || 0)
  if (key === 'period') return row.period || ''
  if (key === 'status') return row.status || ''
  if (key === 'filedAt') return row.filedAt || ''
  return row[key]
}

export function filterLoanAdvances(rows, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return rows
  return rows.filter((row) => {
    const haystack = [row.employeeName, row.employeeId, row.dept, row.type, row.status, row.notes]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
}

export function computeLoanAdvanceStats(rows = []) {
  const active = rows.filter((row) => row.status === 'Active')
  const appliedThisRun = rows.filter((row) => row.appliedThisRun)
  return {
    total: rows.length,
    active: active.length,
    pending: rows.filter((row) => row.status === 'Pending').length,
    closed: rows.filter((row) => row.status === 'Closed').length,
    loans: rows.filter((row) => row.type === 'Loan').length,
    advances: rows.filter((row) => row.type === 'Advance').length,
    outstandingTotal: active.reduce((sum, row) => sum + Number(row.outstanding || 0), 0),
    monthlyDeductions: active.reduce((sum, row) => sum + Number(row.monthlyDeduction || 0), 0),
    appliedDeductionsThisRun: appliedThisRun.reduce((sum, row) => sum + Number(row.deductionThisRun || 0), 0),
    pendingDeductionsThisRun: active
      .filter((row) => row.canApplyDeduction)
      .reduce((sum, row) => sum + Math.min(Number(row.monthlyDeduction || 0), Number(row.outstanding || 0)), 0),
  }
}

export function getLoanAdvanceTabItems(stats = {}) {
  return [
    { key: 'all', label: 'All', count: Number(stats.total || 0) },
    { key: 'active', label: 'Active', count: Number(stats.active || 0) },
    { key: 'pending', label: 'Pending', count: Number(stats.pending || 0) },
    { key: 'closed', label: 'Closed', count: Number(stats.closed || 0) },
  ]
}

export function matchesLoanAdvanceTab(row, tabKey) {
  if (tabKey === 'all') return true
  if (tabKey === 'active') return row.status === 'Active'
  if (tabKey === 'pending') return row.status === 'Pending'
  if (tabKey === 'closed') return row.status === 'Closed'
  return true
}

export function loanAdvanceSortValue(row, key) {
  if (key === 'employee') return row.employeeName || ''
  if (key === 'type') return row.type || ''
  if (key === 'principal') return Number(row.principal || 0)
  if (key === 'monthlyDeduction') return Number(row.monthlyDeduction || 0)
  if (key === 'outstanding') return Number(row.outstanding || 0)
  if (key === 'status') return row.status || ''
  if (key === 'startDate') return row.startDate || ''
  return row[key]
}
