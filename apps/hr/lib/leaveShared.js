export const DEFAULT_LEAVE_POLICIES = [
  { type: 'CL', name: 'Casual Leave', entitlement: 12, carryForward: 5, encashable: false },
  { type: 'SL', name: 'Sick Leave', entitlement: 12, carryForward: 0, encashable: false },
  { type: 'PL', name: 'Privilege Leave', entitlement: 21, carryForward: 10, encashable: true },
  { type: 'CO', name: 'Comp-Off', entitlement: 0, carryForward: 0, encashable: false },
  { type: 'WFH', name: 'WFH', entitlement: 0, carryForward: 0, encashable: false },
]

export const LEAVE_TYPE_OPTIONS = [
  ...DEFAULT_LEAVE_POLICIES.map((p) => ({ value: p.name, label: p.name })),
]

const LEAVE_TYPE_TO_BALANCE_KEY = {
  'Casual Leave': 'cl',
  'Sick Leave': 'sl',
  'Privilege Leave': 'pl',
  'Comp-Off': 'compOff',
  WFH: null,
}

const POLICY_ENTITLEMENTS = Object.fromEntries(
  DEFAULT_LEAVE_POLICIES.map((p) => [p.name, Number(p.entitlement || 0)]),
)

export function calcInclusiveLeaveDays(fromDate, toDate) {
  if (!fromDate) return 1
  const from = new Date(fromDate)
  const to = new Date(toDate || fromDate)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return 1
  if (to < from) return 1
  return Math.max(1, Math.floor((to.getTime() - from.getTime()) / 86400000) + 1)
}

export function formatLeaveStatus(status = '') {
  const raw = String(status || 'pending').toLowerCase()
  if (raw === 'approved') return 'Approved'
  if (raw === 'rejected') return 'Rejected'
  return 'Pending'
}

export function leaveStatusToApi(status = '') {
  return String(status || 'pending').toLowerCase()
}

function isDateInYear(dateString, year) {
  if (!dateString) return false
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return false
  return date.getFullYear() === Number(year)
}

export function computeLeaveBalances(employees = [], requests = [], year = new Date().getFullYear()) {
  const usedByEmployee = new Map()

  for (const request of requests) {
    if (formatLeaveStatus(request.status) !== 'Approved') continue
    if (!isDateInYear(request.from, year)) continue
    const key = String(request.organizationUserId || request.employeeId || '')
    if (!key) continue
    const balanceKey = LEAVE_TYPE_TO_BALANCE_KEY[request.type]
    if (!balanceKey) continue
    const current = usedByEmployee.get(key) || { cl: 0, sl: 0, pl: 0, compOff: 0, lop: 0 }
    current[balanceKey] += Number(request.days || 0)
    usedByEmployee.set(key, current)
  }

  return employees
    .filter((employee) => employee.status !== 'Exited')
    .map((employee) => {
      const key = String(employee.membershipId || employee.id || '')
      const used = usedByEmployee.get(key) || { cl: 0, sl: 0, pl: 0, compOff: 0, lop: 0 }
      const totals = {
        cl: POLICY_ENTITLEMENTS['Casual Leave'] || 0,
        sl: POLICY_ENTITLEMENTS['Sick Leave'] || 0,
        pl: POLICY_ENTITLEMENTS['Privilege Leave'] || 0,
        compOff: POLICY_ENTITLEMENTS['Comp-Off'] || 0,
        lop: 0,
      }
      return {
        employeeId: key,
        employeeName: employee.name || 'Employee',
        employeeCode: employee.employeeId || '',
        department: employee.department || '—',
        cl: Math.max(0, totals.cl - used.cl),
        sl: Math.max(0, totals.sl - used.sl),
        pl: Math.max(0, totals.pl - used.pl),
        compOff: Math.max(0, totals.compOff - used.compOff),
        lop: used.lop,
        used,
        totals,
      }
    })
}

export function computeEmployeeLeaveBalanceRows(employee, requests = [], year = new Date().getFullYear()) {
  if (!employee) return []
  const [balance] = computeLeaveBalances([employee], requests, year)
  if (!balance) return []

  const rows = [
    { id: 'cl', type: 'CL', policyName: 'Casual Leave', usedKey: 'cl', balanceKey: 'cl' },
    { id: 'sl', type: 'SL', policyName: 'Sick Leave', usedKey: 'sl', balanceKey: 'sl' },
    { id: 'pl', type: 'PL', policyName: 'Privilege Leave', usedKey: 'pl', balanceKey: 'pl' },
  ]

  return rows.map(({ id, type, policyName, usedKey, balanceKey }) => {
    const entitlement = POLICY_ENTITLEMENTS[policyName] || 0
    const used = balance.used[usedKey] || 0
    return {
      id,
      type,
      entitlement,
      used,
      balance: balance[balanceKey] ?? 0,
    }
  })
}

export function getApprovedLeavesThisWeekRows(requests = [], referenceDate = new Date()) {
  const start = new Date(referenceDate)
  start.setHours(0, 0, 0, 0)
  const day = start.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  start.setDate(start.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)

  return requests
    .filter((row) => formatLeaveStatus(row.status) === 'Approved')
    .filter((row) => {
      const from = new Date(row.from)
      const to = new Date(row.to || row.from)
      if (Number.isNaN(from.getTime())) return false
      return from <= end && to >= start
    })
}

export function getApprovedLeavesThisWeek(requests = [], referenceDate = new Date()) {
  return getApprovedLeavesThisWeekRows(requests, referenceDate).map((row) => ({
    name: row.employeeName,
    detail: `${row.type.replace(' Leave', '')} · ${row.from}${row.to && row.to !== row.from ? ` – ${row.to}` : ''}`,
  }))
}

export const LEAVE_UPDATED_EVENT = 'hr-leave-updated'

export function notifyLeaveUpdated() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(LEAVE_UPDATED_EVENT))
}
