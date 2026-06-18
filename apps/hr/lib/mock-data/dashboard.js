export const DASHBOARD_KPIS = {
  totalEmployees: { value: 142, change: '+3 this month', changeType: 'increase' },
  onLeaveToday: { value: 7, change: '2 pending approval', changeType: 'neutral' },
  pendingApprovals: { value: 12, badge: 'urgent' },
  openPositions: { value: 5, change: '2 new this week', changeType: 'increase' },
}

export const DEPT_DISTRIBUTION = [
  { dept: 'Engineering', count: 38 },
  { dept: 'Sales', count: 24 },
  { dept: 'HR', count: 8 },
  { dept: 'Finance', count: 12 },
  { dept: 'Ops', count: 20 },
  { dept: 'Design', count: 10 },
  { dept: 'Marketing', count: 14 },
  { dept: 'Others', count: 16 },
]

export const PENDING_APPROVALS = [
  { type: 'leave', title: 'Sneha Reddy — PL 5 days', overdue: true, href: '/leave' },
  { type: 'leave', title: 'Ankit Sharma — CL 2 days', overdue: false, href: '/leave' },
  { type: 'expense', title: 'Arjun Patel — Travel ₹8,900', overdue: true, href: '/expenses' },
  { type: 'expense', title: 'Kavya Iyer — Supplies ₹1,100', overdue: false, href: '/expenses' },
]

export const UPCOMING_EVENTS = [
  { type: 'holiday', title: 'Eid-ul-Adha', date: '2026-06-07' },
  { type: 'birthday', title: 'Priya Nair', date: '2026-06-05' },
  { type: 'birthday', title: 'Ravi Menon', date: '2026-06-08' },
  { type: 'anniversary', title: 'Meera Joshi — 8 years', date: '2026-06-09' },
]

export const PAYROLL_STATUS = {
  month: 'June 2026',
  amount: '₹24,80,000',
  employees: 142,
  status: 'Pending',
}

export const ATTRITION = { rate: 2.3, trend: 'down', change: '-0.4% vs last month' }
