const STATUS_TABS = ['all', 'Active', 'Probation', 'Notice', 'Exited']

export function computeEmployeeStats(employees) {
  const counts = { all: employees.length, Active: 0, Probation: 0, Notice: 0, Exited: 0 }
  for (const e of employees) {
    if (Object.prototype.hasOwnProperty.call(counts, e.status)) {
      counts[e.status] += 1
    }
  }
  return {
    active: counts.Active,
    probation: counts.Probation,
    notice: counts.Notice,
    exited: counts.Exited,
    all: counts.all,
    tabCounts: counts,
  }
}

export function getEmployeeTabItems(counts) {
  return [
    { key: 'all', label: 'All Employees', count: counts.all },
    { key: 'Active', label: 'Active', count: counts.Active },
    { key: 'Probation', label: 'Probation', count: counts.Probation },
    { key: 'Notice', label: 'On Notice', count: counts.Notice },
    { key: 'Exited', label: 'Exited', count: counts.Exited },
  ]
}

export function filterEmployeesWithList(employees, filters) {
  let list = employees
  const { tab, search, department } = filters
  if (tab && tab !== 'all') {
    list = list.filter((e) => e.status === tab)
  }
  const q = (search || '').toLowerCase().trim()
  return list.filter((e) => {
    if (department && e.department !== department) return false
    if (!q) return true
    return (
      e.name.toLowerCase().includes(q) ||
      e.employeeId.toLowerCase().includes(q) ||
      (e.designation || '').toLowerCase().includes(q) ||
      (e.email || '').toLowerCase().includes(q)
    )
  })
}

export { STATUS_TABS }
