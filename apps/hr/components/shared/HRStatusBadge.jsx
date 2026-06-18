'use client'

const STATUS_MAP = {
  Active: 'green',
  Approved: 'green',
  Paid: 'green',
  Verified: 'green',
  Connected: 'green',
  Completed: 'green',
  Resolved: 'green',
  Hired: 'green',
  Open: 'blue',
  WFH: 'blue',
  'In Progress': 'blue',
  Draft: 'gray',
  Closed: 'gray',
  Inactive: 'gray',
  Probation: 'yellow',
  Pending: 'orange',
  'Pending Approval': 'orange',
  Notice: 'orange',
  Paused: 'orange',
  Sent: 'orange',
  Rejected: 'red',
  Exited: 'red',
  Urgent: 'red',
  High: 'red',
  Medium: 'gray',
  Low: 'gray',
  Terminated: 'red',
  Declined: 'red',
}

export default function HRStatusBadge({ status, className = '' }) {
  const variant = STATUS_MAP[status] || 'gray'
  const classes = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    orange: 'bg-orange-100 text-orange-700 border-orange-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
    blue: 'bg-blue-100 text-blue-700 border-blue-200',
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes[variant]} ${className}`}>
      {status}
    </span>
  )
}
