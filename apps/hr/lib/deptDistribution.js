/** Active headcount by department from employee roster */
export function buildDeptDistributionFromEmployees(employees) {
  const counts = new Map()

  for (const e of employees) {
    if (e.status === 'Exited') continue
    const dept = e.department?.trim() || 'Others'
    counts.set(dept, (counts.get(dept) || 0) + 1)
  }

  return [...counts.entries()]
    .map(([dept, count]) => ({ dept, count }))
    .sort((a, b) => b.count - a.count)
}

/** Pie/donut slices with share % for chart + legend */
export function buildDeptChartSlices(employees) {
  const rows = buildDeptDistributionFromEmployees(employees)
  const total = rows.reduce((sum, r) => sum + r.count, 0)

  return rows.map((row, index) => {
    const pct = total > 0 ? Math.round((row.count / total) * 100) : 0
    return {
      ...row,
      name: row.dept,
      value: row.count,
      pct,
      index,
    }
  })
}
