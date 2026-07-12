export const PAYROLL_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'review', label: 'Review' },
  { value: 'locked', label: 'Locked' },
  { value: 'disbursed', label: 'Disbursed' },
]

export const PAYROLL_OVERVIEW_COLUMN_WIDTHS = {
  employee: 260,
  dept: 160,
  gross: 120,
  pf: 100,
  tds: 100,
  net: 120,
  status: 130,
  actions: 168,
}

export const PAYROLL_OVERVIEW_MIN_COLUMN_WIDTHS = { actions: 168 }

export const PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS = [
  { key: 'dept', label: 'Department' },
  { key: 'gross', label: 'Gross' },
  { key: 'pf', label: 'PF' },
  { key: 'tds', label: 'TDS' },
  { key: 'net', label: 'Net' },
  { key: 'status', label: 'Status' },
]

export const PAYROLL_OVERVIEW_DEFAULT_COLUMN_VISIBILITY = PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS.reduce(
  (acc, { key }) => ({ ...acc, [key]: true }),
  {},
)

export const PAYROLL_OVERVIEW_SORT_COLUMN_OPTIONS = [
  { key: 'employee', label: 'Employee' },
  ...PAYROLL_OVERVIEW_TOGGLEABLE_COLUMNS,
]

export const PAYROLL_OVERVIEW_SORTABLE_KEYS = PAYROLL_OVERVIEW_SORT_COLUMN_OPTIONS.map((column) => column.key)

export function payrollOverviewSortValue(row, key) {
  if (key === 'employee') return row.name || ''
  if (key === 'dept') return row.dept || ''
  if (key === 'status') return row.status || ''
  return Number(row[key] || 0)
}

const DEFAULT_SALARY_SPLIT = {
  basicPercent: 40,
  hraPercent: 20,
  specialAllowancePercent: 30,
  fbpPercent: 10,
}

function toPayrollMoney(value) {
  return Math.max(0, Math.round(Number(value || 0)))
}

function payrollTdsRate(annualGross) {
  if (annualGross <= 500000) return 0
  if (annualGross <= 1000000) return 0.05
  return 0.1
}

export function estimatePayrollFromCtc(annualCtc, structure = null) {
  const annual = toPayrollMoney(annualCtc)
  if (!annual) {
    return {
      basic: 0,
      hra: 0,
      specialAllowance: 0,
      fbp: 0,
      gross: 0,
      pf: 0,
      esi: 0,
      pt: 0,
      tds: 0,
      deductionsTotal: 0,
      net: 0,
      missingSalaryStructure: true,
    }
  }

  const split = structure || DEFAULT_SALARY_SPLIT
  const monthlyGross = toPayrollMoney(annual / 12)
  const basic = toPayrollMoney((monthlyGross * Number(split.basicPercent || DEFAULT_SALARY_SPLIT.basicPercent)) / 100)
  const hra = toPayrollMoney((monthlyGross * Number(split.hraPercent || DEFAULT_SALARY_SPLIT.hraPercent)) / 100)
  const specialAllowance = toPayrollMoney(
    (monthlyGross * Number(split.specialAllowancePercent || DEFAULT_SALARY_SPLIT.specialAllowancePercent)) / 100,
  )
  const fbp = toPayrollMoney(monthlyGross - basic - hra - specialAllowance)
  const pfBase = Math.min(basic, 15000)
  const pf = toPayrollMoney(pfBase * 0.12)
  const esi = monthlyGross <= 21000 ? toPayrollMoney(monthlyGross * 0.0075) : 0
  const pt = monthlyGross > 15000 ? 200 : 0
  const tds = toPayrollMoney(monthlyGross * payrollTdsRate(annual))
  const deductionsTotal = toPayrollMoney(pf + esi + pt + tds)
  const net = toPayrollMoney(monthlyGross - deductionsTotal)

  return {
    basic,
    hra,
    specialAllowance,
    fbp,
    gross: monthlyGross,
    pf,
    esi,
    pt,
    tds,
    deductionsTotal,
    net,
    missingSalaryStructure: !structure,
  }
}

export function formatPayrollRunStatus(status) {
  const value = String(status || 'draft').toLowerCase()
  if (value === 'review') return 'Review'
  if (value === 'locked') return 'Locked'
  if (value === 'disbursed') return 'Disbursed'
  return 'Draft'
}

export function employeePayrollStatusLabel(runStatus) {
  const value = String(runStatus || 'draft').toLowerCase()
  if (value === 'disbursed') return 'Paid'
  if (value === 'review') return 'Review'
  if (value === 'locked') return 'Locked'
  return 'Draft'
}

export function payrollLineItemRouteId(line) {
  if (!line) return null
  return line.id ?? line.documentId ?? null
}

export function payrollLineItemMatchesId(line, id) {
  if (!line || id == null || id === '') return false
  const target = String(id)
  return [line.id, line.documentId].some((value) => value != null && String(value) === target)
}

export function buildPayrollRecordFromLine(line) {
  const orgUser = line?.organizationUser || {}
  const user = orgUser.user || {}
  const profile = line?.employeeProfile || {}
  const run = line?.payrollRun || {}
  const name =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.username ||
    user.email ||
    `Member ${orgUser.id || ''}`
  const dept = orgUser?.primaryDepartment?.name || orgUser?.departments?.[0]?.name || '—'
  const month = Number(run.month || 0)
  const year = Number(run.year || 0)
  const monthLabel =
    month && year
      ? new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
      : '—'

  return {
    record: {
      id: payrollLineItemRouteId(line),
      lineItemPk: line?.id ?? null,
      employeeRefId: orgUser.id,
      employeeId: profile.employeeCode || `WF-${1000 + Number(orgUser.id || 0)}`,
      name,
      designation: profile.designation || line?.salaryStructure?.name || '—',
      dept,
      gross: Number(line?.gross || 0),
      pf: Number(line?.pf || 0),
      esi: Number(line?.esi || 0),
      pt: Number(line?.pt || 0),
      tds: Number(line?.tds || 0),
      net: Number(line?.net || 0),
      status: employeePayrollStatusLabel(run.status || 'draft'),
      runStatus: String(run.status || 'draft').toLowerCase(),
    },
    monthLabel,
    run,
    runId: run.id ?? null,
  }
}

export function mapEmployeePayrollHistoryRow(line) {
  const run = line.payrollRun || {}
  const month = Number(run.month || 1)
  const year = Number(run.year || new Date().getFullYear())
  const monthLabel = new Date(year, month - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const deductions =
    Number(line.deductionsTotal || 0) ||
    Number(line.pf || 0) + Number(line.esi || 0) + Number(line.pt || 0) + Number(line.tds || 0)
  const runStatus = String(run.status || 'draft').toLowerCase()

  const routeId = payrollLineItemRouteId(line)

  return {
    id: routeId,
    lineItemId: routeId,
    lineItemPk: line.id ?? null,
    month: monthLabel,
    gross: Number(line.gross || 0),
    deductions,
    net: Number(line.net || 0),
    status: employeePayrollStatusLabel(runStatus),
    runStatus,
    year,
    monthNum: month,
  }
}

export function sortEmployeePayrollHistory(rows) {
  return [...rows].sort((a, b) => b.year - a.year || b.monthNum - a.monthNum)
}

export function getPayrollRecordDataReadiness(record = {}) {
  if (record.missingSalaryStructure) return 'Missing salary structure'
  if (record.missingBankDetails) return 'Missing bank details'
  return 'Ready for payroll'
}

export function getPayrollRecordTableStatus(record = {}) {
  if (record.missingSalaryStructure) return 'Missing Structure'
  if (record.missingBankDetails) return 'Missing Bank'
  return formatPayrollRunStatus(record.status)
}

export async function resolvePayrollLineItemBlockers(record, amounts, getEmployeeById) {
  const gross = Number(amounts.gross || 0)
  const net = Number(amounts.net || 0)
  let missingSalaryStructure = Boolean(record.missingSalaryStructure)
  let missingBankDetails = Boolean(record.missingBankDetails)

  if (record.employeeRefId && getEmployeeById) {
    try {
      const { employee } = await getEmployeeById(String(record.employeeRefId))
      const hasStructure = Boolean(employee?.salaryStructureId)
      const hasCtc = Number(employee?.annualCtc || 0) > 0
      const hasBank = Boolean(
        employee?.bankAccountNumber && employee?.bankIfsc && employee?.bankName,
      )
      missingBankDetails = !hasBank
      missingSalaryStructure = !hasStructure || !hasCtc
    } catch {
      // Keep existing flags when employee lookup fails.
    }
  }

  if (gross > 0 && net > 0) {
    missingSalaryStructure = false
  } else if (gross <= 0) {
    missingSalaryStructure = true
  }

  return { missingSalaryStructure, missingBankDetails }
}

export function runBannerPayload(run) {
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

export function lineItemToRow(line, run) {
  const orgUser = line.organizationUser || {}
  const user = orgUser.user || {}
  const profile = line.employeeProfile || {}
  const name =
    `${user.firstName || ''} ${user.lastName || ''}`.trim() ||
    user.username ||
    user.email ||
    `Member ${orgUser.id || ''}`
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
    esi: Number(line.esi || 0),
    pt: Number(line.pt || 0),
    tds: Number(line.tds || 0),
    net: Number(line.net || 0),
    status: run?.status || 'draft',
    missingSalaryStructure: Boolean(line.missingSalaryStructure),
    missingBankDetails: Boolean(line.missingBankDetails),
    payslipGeneratedAt: line.payslipGeneratedAt || null,
  }
}
