/**
 * Cumulative active headcount by month from employee join dates (no static chart series).
 */
export function buildHeadcountTrendFromEmployees(employees, monthCount = 6) {
  const now = new Date()
  const points = []

  for (let i = monthCount - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59, 999)
    const isLatestMonth = i === monthCount - 1
    const label = monthStart.toLocaleDateString('en-US', { month: 'short' })

    const count = employees.filter((e) => {
      if (!e.joinDate) return false
      const joined = new Date(e.joinDate)
      if (Number.isNaN(joined.getTime()) || joined > monthEnd) return false
      if (e.status === 'Exited' && isLatestMonth) return false
      return true
    }).length

    points.push({ month: label, count })
  }

  return points
}

export function headcountYAxisMax(values) {
  const max = Math.max(0, ...values)
  if (max <= 0) return 10
  const padded = max * 1.2
  const step = max >= 100 ? 20 : max >= 40 ? 10 : 5
  return Math.max(step, Math.ceil(padded / step) * step)
}
