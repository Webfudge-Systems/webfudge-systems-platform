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

export function filterPayslips(payslips, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return payslips
  return payslips.filter(
    (p) =>
      p.employee.toLowerCase().includes(q) ||
      p.month.toLowerCase().includes(q) ||
      p.status.toLowerCase().includes(q)
  )
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
  return items.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.status.toLowerCase().includes(q)
  )
}
