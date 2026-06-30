'use client'

import { Badge } from '@webfudge/ui'

const STATUS_MAP = {
  Active: 'success',
  Approved: 'success',
  Paid: 'success',
  Verified: 'success',
  Connected: 'success',
  Completed: 'success',
  Resolved: 'success',
  Hired: 'success',
  Open: 'primary',
  WFH: 'primary',
  Present: 'success',
  'On Leave': 'warning',
  Absent: 'danger',
  'Not Marked': 'gray',
  'In Progress': 'primary',
  Draft: 'gray',
  Closed: 'gray',
  Inactive: 'gray',
  Probation: 'warning',
  Pending: 'orange',
  'Pending Approval': 'orange',
  Notice: 'orange',
  Paused: 'orange',
  Sent: 'orange',
  Rejected: 'danger',
  Exited: 'danger',
  Urgent: 'danger',
  High: 'danger',
  Medium: 'gray',
  Low: 'gray',
  Terminated: 'danger',
  Declined: 'danger',
}

export default function HRStatusBadge({ status, className }) {
  return (
    <Badge variant={STATUS_MAP[status] || 'gray'} className={className}>
      {status}
    </Badge>
  )
}
