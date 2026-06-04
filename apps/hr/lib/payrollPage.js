import {
  PAYROLL_EMPLOYEES,
  PAYSLIPS,
  SALARY_STRUCTURES,
  COMPLIANCE_ITEMS,
  PAYROLL_RUN,
  PAYROLL_SUMMARY,
} from './mock-data/payroll'

export function computePayrollStats(summary = PAYROLL_SUMMARY, run = PAYROLL_RUN) {
  const formatL = (n) => `₹${(n / 100000).toFixed(1)}L`
  const formatK = (n) => `₹${(n / 1000).toFixed(0)}K`

  return {
    month: run.month,
    employees: run.employees,
    runStatus: run.status,
    totalGross: formatL(summary.totalGross),
    totalDeductions: formatK(summary.totalDeductions),
    totalNet: formatL(summary.totalNet),
    pfLiability: formatK(summary.pfLiability),
    esiLiability: formatK(summary.esiLiability),
    tdsLiability: formatK(summary.tdsLiability),
    ptLiability: formatK(summary.ptLiability),
    draftCount: PAYROLL_EMPLOYEES.filter((e) => e.status === 'Draft').length,
  }
}

export function getPayrollTabItems() {
  return [
    { key: 'overview', label: 'Overview', count: PAYROLL_EMPLOYEES.length },
    { key: 'structures', label: 'Salary Structures', count: SALARY_STRUCTURES.length },
    { key: 'payslips', label: 'Payslips', count: PAYSLIPS.length },
    { key: 'compliance', label: 'Compliance', count: COMPLIANCE_ITEMS.length },
    { key: 'loans', label: 'Loans & Advances', count: 0 },
  ]
}

export function filterPayrollEmployees(employees, search = '') {
  const q = search.toLowerCase().trim()
  if (!q) return employees
  return employees.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q) ||
      e.id.toLowerCase().includes(q)
  )
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
      (s.components || '').toLowerCase().includes(q)
  )
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
