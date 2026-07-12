import { Users, Calendar, Clock, Briefcase } from 'lucide-react'

function countSubtitle(count, singular, plural = `${count} ${singular}s`) {
  if (count === 0) return `No ${singular}s`
  if (count === 1) return `1 ${singular}`
  return plural
}

export function buildDashboardKpiStats({
  activeEmployeeCount = 0,
  onLeaveToday = 0,
  pendingApprovals = 0,
  openPositions = 0,
  loading = false,
  router,
} = {}) {
  const value = (count) => (loading ? '—' : String(count))

  return [
    {
      title: 'Total Employees',
      value: value(activeEmployeeCount),
      subtitle: loading
        ? 'Loading employees…'
        : countSubtitle(activeEmployeeCount, 'employee', `${activeEmployeeCount} employees`),
      icon: Users,
      colorScheme: 'orange',
      onClick: () => router?.push('/employees'),
    },
    {
      title: 'On Leave Today',
      value: value(onLeaveToday),
      subtitle: loading
        ? 'Loading leave data…'
        : onLeaveToday === 0
          ? 'No one on leave'
          : `${onLeaveToday} on leave`,
      icon: Calendar,
      colorScheme: 'orange',
      onClick: () => router?.push('/leave'),
    },
    {
      title: 'Pending Approvals',
      value: value(pendingApprovals),
      subtitle: loading
        ? 'Loading approvals…'
        : pendingApprovals === 0
          ? 'None pending'
          : `${pendingApprovals} pending`,
      icon: Clock,
      colorScheme: 'orange',
      onClick: () => router?.push('/leave'),
    },
    {
      title: 'Open Positions',
      value: value(openPositions),
      subtitle: loading
        ? 'Loading recruitment…'
        : openPositions === 0
          ? 'No openings'
          : `${openPositions} open`,
      icon: Briefcase,
      colorScheme: 'orange',
      onClick: () => router?.push('/recruitment'),
    },
  ]
}
