export const LEAVE_REQUESTS = [
  { id: 'lr-1', employeeId: 'emp-001', employeeName: 'Ankit Sharma', type: 'Casual Leave', from: '2026-06-10', to: '2026-06-11', days: 2, reason: 'Family function', appliedOn: '2026-06-01', status: 'Pending' },
  { id: 'lr-2', employeeId: 'emp-002', employeeName: 'Priya Nair', type: 'Sick Leave', from: '2026-06-03', to: '2026-06-03', days: 1, reason: 'Fever', appliedOn: '2026-06-02', status: 'Approved' },
  { id: 'lr-3', employeeId: 'emp-004', employeeName: 'Sneha Reddy', type: 'Privilege Leave', from: '2026-06-20', to: '2026-06-24', days: 5, reason: 'Vacation', appliedOn: '2026-05-28', status: 'Pending' },
  { id: 'lr-4', employeeId: 'emp-006', employeeName: 'Kavya Iyer', type: 'Casual Leave', from: '2026-05-15', to: '2026-05-16', days: 2, reason: 'Personal', appliedOn: '2026-05-10', status: 'Approved' },
  { id: 'lr-5', employeeId: 'emp-011', employeeName: 'Aisha Khan', type: 'Sick Leave', from: '2026-06-02', to: '2026-06-02', days: 1, reason: 'Medical', appliedOn: '2026-06-02', status: 'Rejected' },
  { id: 'lr-6', employeeId: 'emp-012', employeeName: 'Suresh Kumar', type: 'WFH', from: '2026-06-04', to: '2026-06-04', days: 1, reason: 'Home repair', appliedOn: '2026-06-03', status: 'Approved' },
  { id: 'lr-7', employeeId: 'emp-008', employeeName: 'Arjun Patel', type: 'Casual Leave', from: '2026-06-08', to: '2026-06-09', days: 2, reason: 'Travel', appliedOn: '2026-06-05', status: 'Pending' },
  { id: 'lr-8', employeeId: 'emp-015', employeeName: 'Divya Menon', type: 'Privilege Leave', from: '2026-06-15', to: '2026-06-30', days: 12, reason: 'Notice period break', appliedOn: '2026-05-20', status: 'Approved' },
  { id: 'lr-9', employeeId: 'emp-013', employeeName: 'Neha Gupta', type: 'Comp-Off', from: '2026-06-06', to: '2026-06-06', days: 1, reason: 'Weekend work', appliedOn: '2026-06-04', status: 'Pending' },
  { id: 'lr-10', employeeId: 'emp-010', employeeName: 'Rohit Desai', type: 'Sick Leave', from: '2026-05-22', to: '2026-05-23', days: 2, reason: 'Flu', appliedOn: '2026-05-21', status: 'Approved' },
]

export const LEAVE_BALANCES = [
  { employeeId: 'emp-001', employeeName: 'Ankit Sharma', department: 'Engineering', cl: 9, sl: 11, pl: 16, compOff: 2, lop: 0 },
  { employeeId: 'emp-002', employeeName: 'Priya Nair', department: 'Engineering', cl: 10, sl: 10, pl: 18, compOff: 0, lop: 0 },
  { employeeId: 'emp-004', employeeName: 'Sneha Reddy', department: 'Sales', cl: 8, sl: 12, pl: 14, compOff: 1, lop: 0 },
]

export const LEAVE_POLICIES = [
  { type: 'CL', name: 'Casual Leave', entitlement: 12, carryForward: 5, encashable: false },
  { type: 'SL', name: 'Sick Leave', entitlement: 12, carryForward: 0, encashable: false },
  { type: 'PL', name: 'Privilege Leave', entitlement: 21, carryForward: 10, encashable: true },
  { type: 'CO', name: 'Comp-Off', entitlement: 0, carryForward: 0, encashable: false },
]
