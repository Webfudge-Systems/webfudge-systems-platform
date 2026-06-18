export const ATTENDANCE_TODAY = {
  present: 118,
  onLeave: 7,
  absent: 5,
  wfh: 12,
  notMarked: 0,
}

export const ATTENDANCE_LOG = [
  { employeeId: 'emp-001', name: 'Ankit Sharma', clockIn: '09:12', clockOut: '18:45', duration: '9h 33m', status: 'Present', location: 'Bangalore HQ', late: true },
  { employeeId: 'emp-002', name: 'Priya Nair', clockIn: '09:02', clockOut: '18:10', duration: '9h 08m', status: 'Present', location: 'Bangalore HQ', late: false },
  { employeeId: 'emp-003', name: 'Ravi Menon', clockIn: '08:55', clockOut: '19:00', duration: '10h 05m', status: 'Present', location: 'Bangalore HQ', late: false },
  { employeeId: 'emp-004', name: 'Sneha Reddy', clockIn: '—', clockOut: '—', duration: '—', status: 'On Leave', location: '—', late: false },
  { employeeId: 'emp-006', name: 'Kavya Iyer', clockIn: '09:45', clockOut: '18:30', duration: '8h 45m', status: 'Present', location: 'Remote', late: true },
  { employeeId: 'emp-012', name: 'Suresh Kumar', clockIn: '—', clockOut: '—', duration: '—', status: 'WFH', location: 'Home', late: false },
]

export const SHIFTS = [
  { id: 's1', name: 'Morning', timing: '9:00 AM – 6:00 PM', employees: 98 },
  { id: 's2', name: 'Evening', timing: '2:00 PM – 11:00 PM', employees: 28 },
  { id: 's3', name: 'Night', timing: '10:00 PM – 7:00 AM', employees: 16 },
]

export const OVERTIME_RECORDS = [
  { employee: 'Ankit Sharma', date: '2026-05-28', regular: 8, ot: 2, amount: 2400, status: 'Approved' },
  { employee: 'Suresh Kumar', date: '2026-05-30', regular: 8, ot: 4, amount: 3200, status: 'Pending Approval' },
  { employee: 'Priya Nair', date: '2026-06-01', regular: 8, ot: 1.5, amount: 1125, status: 'Paid' },
]
