export const HELPDESK_TICKETS = [
  { id: 'HD-1042', employee: 'Ankit Sharma', category: 'Payroll', subject: 'Payslip discrepancy May', priority: 'High', created: '2026-06-02', updated: '2026-06-03', status: 'Open', assignee: 'Lakshmi Venkat' },
  { id: 'HD-1041', employee: 'Priya Nair', category: 'Leave', subject: 'CL balance not updated', priority: 'Medium', created: '2026-06-01', updated: '2026-06-02', status: 'In Progress', assignee: 'Kavya Iyer' },
  { id: 'HD-1040', employee: 'Sneha Reddy', category: 'Policy', subject: 'Travel policy clarification', priority: 'Low', created: '2026-05-30', updated: '2026-05-31', status: 'Resolved', assignee: 'Meera Joshi' },
  { id: 'HD-1039', employee: 'Suresh Kumar', category: 'IT', subject: 'VPN access for WFH', priority: 'High', created: '2026-05-29', updated: '2026-06-01', status: 'Closed', assignee: 'IT Support' },
  { id: 'HD-1038', employee: 'Aisha Khan', category: 'Other', subject: 'ID card not received', priority: 'Medium', created: '2026-05-28', updated: '2026-05-29', status: 'Open', assignee: 'Imran Sheikh' },
  { id: 'HD-1037', employee: 'Arjun Patel', category: 'Payroll', subject: 'Form 16 request', priority: 'Low', created: '2026-05-25', updated: '2026-05-26', status: 'Resolved', assignee: 'Lakshmi Venkat' },
]

export const TICKET_THREADS = {
  'HD-1042': [
    { author: 'Ankit Sharma', role: 'employee', text: 'My May payslip shows incorrect PF deduction.', time: '2026-06-02 10:30' },
    { author: 'Lakshmi Venkat', role: 'agent', text: 'Thanks Ankit — we are checking with payroll. Will update by EOD.', time: '2026-06-02 14:15' },
  ],
}

export const FAQ_ITEMS = [
  { category: 'Leave', q: 'How do I apply for casual leave?', a: 'Go to Leave > Requests and submit a new request. Manager approval is required.' },
  { category: 'Payroll', q: 'When is salary credited?', a: 'Salaries are disbursed on the last working day of each month.' },
  { category: 'Attendance', q: 'How do I mark WFH?', a: 'Apply for WFH under Leave or mark attendance as WFH in the attendance portal.' },
]

export const TICKET_CATEGORIES = [
  { name: 'Payroll', sub: ['Payslip', 'Tax', 'Reimbursement'], slaHours: 24, assignee: 'Payroll Team' },
  { name: 'Leave', sub: ['Balance', 'Approval'], slaHours: 12, assignee: 'HR Team' },
]
