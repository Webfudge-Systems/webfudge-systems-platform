export const EXPENSE_CLAIMS = [
  { id: 'ex-1', employee: 'Sneha Reddy', category: 'Travel', amount: 12400, submitted: '2026-06-01', receipt: true, status: 'Pending', description: 'Client visit Mumbai' },
  { id: 'ex-2', employee: 'Ankit Sharma', category: 'Food', amount: 850, submitted: '2026-06-02', receipt: true, status: 'Approved', description: 'Team lunch' },
  { id: 'ex-3', employee: 'Neha Gupta', category: 'Client Entertainment', amount: 5600, submitted: '2026-05-28', receipt: true, status: 'Paid', description: 'Campaign dinner' },
  { id: 'ex-4', employee: 'Rohit Desai', category: 'Office Supplies', amount: 3200, submitted: '2026-05-25', receipt: true, status: 'Rejected', description: 'Missing receipt detail' },
  { id: 'ex-5', employee: 'Arjun Patel', category: 'Travel', amount: 8900, submitted: '2026-06-03', receipt: true, status: 'Pending', description: 'Audit travel Ahmedabad' },
  { id: 'ex-6', employee: 'Priya Nair', category: 'Food', amount: 420, submitted: '2026-05-30', receipt: false, status: 'Approved', description: 'Late night sprint' },
  { id: 'ex-7', employee: 'Vikram Singh', category: 'Travel', amount: 18500, submitted: '2026-05-20', receipt: true, status: 'Paid', description: 'Q2 sales conference' },
  { id: 'ex-8', employee: 'Kavya Iyer', category: 'Office Supplies', amount: 1100, submitted: '2026-06-02', receipt: true, status: 'Pending', description: 'Onboarding kits' },
]

export const EXPENSE_PAYOUTS = [
  { employee: 'Neha Gupta', amount: 5600, method: 'Bank Transfer', scheduled: '2026-06-05', status: 'Completed' },
  { employee: 'Vikram Singh', amount: 18500, method: 'Payroll', scheduled: '2026-06-10', status: 'Scheduled' },
]
