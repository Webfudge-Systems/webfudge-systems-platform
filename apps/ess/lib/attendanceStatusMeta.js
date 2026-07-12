export const ATTENDANCE_STATUS_META = {
  present: {
    label: 'Present',
    dotClass: 'bg-emerald-400',
    badgeClass: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    cellClass: 'bg-emerald-100 text-emerald-900',
  },
  absent: {
    label: 'Absent',
    dotClass: 'bg-red-400',
    badgeClass: 'bg-red-50 text-red-800 ring-red-200',
    cellClass: 'bg-red-100 text-red-900',
  },
  not_marked: {
    label: 'Not Marked',
    dotClass: 'bg-gray-300',
    badgeClass: 'bg-gray-50 text-gray-700 ring-gray-200',
    cellClass: 'bg-gray-100 text-gray-600',
  },
  leave: {
    label: 'On Leave',
    dotClass: 'bg-orange-300',
    badgeClass: 'bg-orange-50 text-orange-800 ring-orange-200',
    cellClass: 'bg-orange-100 text-orange-900',
  },
  wfh: {
    label: 'WFH',
    dotClass: 'bg-blue-400',
    badgeClass: 'bg-blue-50 text-blue-800 ring-blue-200',
    cellClass: 'bg-blue-100 text-blue-900',
  },
  holiday: {
    label: 'Holiday',
    dotClass: 'bg-gray-400',
    badgeClass: 'bg-gray-50 text-gray-700 ring-gray-200',
    cellClass: 'bg-gray-200 text-gray-700',
  },
  weekend: {
    label: 'Weekend',
    dotClass: 'bg-gray-200',
    badgeClass: 'bg-gray-50 text-gray-500 ring-gray-200',
    cellClass: 'bg-gray-50 text-gray-400',
  },
}

export function leaveStatusBadgeVariant(status = '') {
  const raw = String(status || '').toLowerCase()
  if (raw === 'approved') return 'success'
  if (raw === 'rejected') return 'danger'
  if (raw === 'cancelled') return 'neutral'
  return 'warning'
}

export function regularizationStatusBadgeVariant(status = '') {
  const raw = String(status || '').toLowerCase()
  if (raw === 'approved') return 'success'
  if (raw === 'rejected') return 'danger'
  return 'warning'
}

export function attendanceStatusBadgeVariant(status = '') {
  const raw = String(status || '').toLowerCase()
  if (raw === 'present') return 'success'
  if (raw === 'absent') return 'danger'
  if (raw === 'leave' || raw === 'on_leave') return 'warning'
  if (raw === 'wfh') return 'info'
  if (raw === 'weekend') return 'neutral'
  return 'neutral'
}
