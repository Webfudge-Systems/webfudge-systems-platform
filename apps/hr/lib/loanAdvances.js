const STORAGE_KEY = 'hr.payroll.loanAdvances'

function readAll() {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function writeAll(rows) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
}

function normalizeLoan(row) {
  return {
    ...row,
    appliedRuns: Array.isArray(row.appliedRuns) ? row.appliedRuns : [],
    principal: Number(row.principal || 0),
    monthlyDeduction: Number(row.monthlyDeduction || 0),
    outstanding: Number(row.outstanding ?? row.principal ?? 0),
  }
}

function employeeIdsInRun(lineItems = []) {
  return new Set(lineItems.map((line) => String(line.employeeRefId || '')).filter(Boolean))
}

function enrichLoanForRun(loan, runId) {
  const normalized = normalizeLoan(loan)
  const applied = normalized.appliedRuns.find((entry) => String(entry.runId) === String(runId))
  const deductionThisRun = applied ? Number(applied.amount || 0) : 0
  return {
    ...normalized,
    appliedThisRun: Boolean(applied),
    deductionThisRun,
    canApplyDeduction:
      normalized.status === 'Active' &&
      normalized.outstanding > 0 &&
      normalized.monthlyDeduction > 0 &&
      !applied,
  }
}

export function loadLoanAdvances(runId, lineItems = []) {
  if (!runId) return []
  const employeeIds = employeeIdsInRun(lineItems)
  return readAll()
    .map(normalizeLoan)
    .filter((row) => {
      const originRunId = row.originPayrollRunId || row.payrollRunId
      if (String(originRunId) === String(runId)) return true
      if (row.organizationUserId && employeeIds.has(String(row.organizationUserId))) return true
      return false
    })
    .map((row) => enrichLoanForRun(row, runId))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
}

export function createLoanAdvance(payload) {
  const rows = readAll().map(normalizeLoan)
  const principal = Number(payload.principal || 0)
  const monthlyDeduction = Number(payload.monthlyDeduction || 0)
  const isAdvance = String(payload.type || 'Loan') === 'Advance'
  const record = normalizeLoan({
    id: `loan-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    organizationUserId: String(payload.organizationUserId || ''),
    originPayrollRunId: String(payload.payrollRunId || ''),
    payrollLineItemId: String(payload.payrollLineItemId || ''),
    employeeName: payload.employeeName || '',
    employeeId: payload.employeeId || '',
    dept: payload.dept || '—',
    type: payload.type || 'Loan',
    principal,
    monthlyDeduction,
    outstanding: principal,
    status: payload.status || (isAdvance && payload.requireApproval ? 'Pending' : 'Active'),
    startDate: payload.startDate || new Date().toISOString(),
    notes: payload.notes || '',
    appliedRuns: [],
    createdAt: new Date().toISOString(),
  })
  rows.unshift(record)
  writeAll(rows)
  return record
}

export function approveLoanAdvance(id) {
  const rows = readAll().map(normalizeLoan)
  const target = rows.find((row) => String(row.id) === String(id))
  if (!target || target.status !== 'Pending') return rows
  const next = rows.map((row) =>
    String(row.id) === String(id) ? { ...row, status: 'Active' } : row,
  )
  writeAll(next)
  return next
}

export function applyLoanDeduction(id, runId) {
  const rows = readAll().map(normalizeLoan)
  const target = rows.find((row) => String(row.id) === String(id))
  if (!target || target.status !== 'Active' || !runId) return rows

  const alreadyApplied = target.appliedRuns.some((entry) => String(entry.runId) === String(runId))
  if (alreadyApplied) return rows

  const deduction = Math.min(Number(target.monthlyDeduction || 0), Number(target.outstanding || 0))
  if (deduction <= 0) return rows

  const nextOutstanding = Math.max(0, Number(target.outstanding || 0) - deduction)
  const next = rows.map((row) => {
    if (String(row.id) !== String(id)) return row
    return normalizeLoan({
      ...row,
      outstanding: nextOutstanding,
      status: nextOutstanding <= 0 ? 'Closed' : row.status,
      appliedRuns: [
        ...row.appliedRuns,
        { runId: String(runId), amount: deduction, appliedAt: new Date().toISOString() },
      ],
    })
  })
  writeAll(next)
  return next
}

export function closeLoanAdvance(id) {
  const rows = readAll().map(normalizeLoan)
  const target = rows.find((row) => String(row.id) === String(id))
  if (!target) return rows
  const next = rows.map((row) =>
    String(row.id) === String(id) ? { ...row, status: 'Closed', outstanding: 0 } : row,
  )
  writeAll(next)
  return next
}
