/** Map HR employee / record status labels to shared `Badge` variants. */
export function employeeStatusBadgeVariant(status) {
  const map = {
    Active: 'active',
    Approved: 'success',
    Paid: 'success',
    Verified: 'success',
    Completed: 'success',
    Resolved: 'success',
    Hired: 'success',
    Open: 'info',
    WFH: 'info',
    'In Progress': 'info',
    Draft: 'gray',
    Closed: 'gray',
    Inactive: 'gray',
    Probation: 'pending',
    Pending: 'pending',
    'Pending Approval': 'pending',
    Notice: 'warning',
    Paused: 'warning',
    Sent: 'warning',
    Rejected: 'danger',
    Exited: 'danger',
    Urgent: 'danger',
    High: 'danger',
    Terminated: 'danger',
    Declined: 'danger',
  }
  return map[status] || 'gray'
}
