export const PAYROLL_RUN = {
  month: 'June 2026',
  gross: 2480000,
  employees: 142,
  status: 'Draft',
  steps: ['Review', 'Lock', 'Disburse'],
  currentStep: 0,
}

export const PAYROLL_SUMMARY = {
  totalGross: 2480000,
  totalDeductions: 412000,
  totalNet: 2068000,
  pfLiability: 198400,
  esiLiability: 24800,
  ptLiability: 42600,
  tdsLiability: 146200,
}

export const PAYROLL_EMPLOYEES = [
  { id: 'emp-001', employeeId: 'WF-1001', name: 'Ankit Sharma', designation: 'Senior Software Engineer', dept: 'Engineering', gross: 95000, pf: 11400, esi: 713, pt: 200, tds: 8200, net: 74487, status: 'Draft' },
  { id: 'emp-002', employeeId: 'WF-1002', name: 'Priya Nair', designation: 'Software Engineer', dept: 'Engineering', gross: 65000, pf: 7800, esi: 488, pt: 200, tds: 4100, net: 52412, status: 'Draft' },
  { id: 'emp-004', employeeId: 'WF-1004', name: 'Sneha Reddy', designation: 'Sales Manager', dept: 'Sales', gross: 82000, pf: 9840, esi: 615, pt: 200, tds: 6800, net: 64545, status: 'Draft' },
  { id: 'emp-007', employeeId: 'WF-1007', name: 'Meera Joshi', designation: 'HR Manager', dept: 'HR', gross: 78000, pf: 9360, esi: 585, pt: 200, tds: 6200, net: 61655, status: 'Draft' },
  { id: 'emp-009', employeeId: 'WF-1009', name: 'Deepa Krishnan', designation: 'Finance Manager', dept: 'Finance', gross: 88000, pf: 10560, esi: 660, pt: 200, tds: 7500, net: 69080, status: 'Draft' },
]

export function getPayrollEmployeeById(id) {
  return PAYROLL_EMPLOYEES.find((e) => e.id === id) || null
}

export function getSalaryStructureById(id) {
  return SALARY_STRUCTURES.find((s) => s.id === id) || null
}

export const SALARY_STRUCTURES = [
  { id: 'ss-1', name: 'Junior Dev Structure', ctcMin: 600000, ctcMax: 1200000, headcount: 24, components: 'Basic 40%, HRA 20%, Special 40%' },
  { id: 'ss-2', name: 'Manager Band', ctcMin: 1500000, ctcMax: 3500000, headcount: 18, components: 'Basic 35%, HRA 25%, Special 40%' },
  { id: 'ss-3', name: 'Intern Structure', ctcMin: 240000, ctcMax: 360000, headcount: 6, components: 'Stipend flat' },
]

export const PAYSLIPS = PAYROLL_EMPLOYEES.map((e) => ({
  id: `ps-${e.id}`,
  employeeId: e.id,
  employee: e.name,
  month: 'June 2026',
  gross: e.gross,
  net: e.net,
  status: 'Generated',
}))

export const COMPLIANCE_ITEMS = [
  { name: 'PF Challan', amount: 198400, dueDate: '2026-06-15', status: 'Pending' },
  { name: 'ESI Challan', amount: 24800, dueDate: '2026-06-15', status: 'Pending' },
  { name: 'PT Challan', amount: 42600, dueDate: '2026-06-20', status: 'Filed' },
  { name: 'TDS Return (24Q)', amount: 146200, dueDate: '2026-07-31', status: 'Draft' },
  { name: 'ECR File', amount: 0, dueDate: '2026-06-10', status: 'Submitted' },
]
