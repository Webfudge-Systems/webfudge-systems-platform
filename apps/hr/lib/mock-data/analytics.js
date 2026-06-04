export const HEADCOUNT_ANALYTICS = {
  total: 142,
  newHires: 6,
  exits: 2,
  netChange: 4,
  byDept: [
    { dept: 'Engineering', headcount: 38, pct: 26.8, tenure: '2.4y', avgSalary: 1450000 },
    { dept: 'Sales', headcount: 24, pct: 16.9, tenure: '2.1y', avgSalary: 1320000 },
    { dept: 'Operations', headcount: 20, pct: 14.1, tenure: '3.0y', avgSalary: 980000 },
    { dept: 'HR', headcount: 8, pct: 5.6, tenure: '2.8y', avgSalary: 1100000 },
    { dept: 'Finance', headcount: 12, pct: 8.5, tenure: '3.2y', avgSalary: 1250000 },
    { dept: 'Design', headcount: 6, pct: 4.2, tenure: '1.9y', avgSalary: 1180000 },
  ],
  trend12: [128, 129, 130, 131, 133, 134, 135, 137, 138, 139, 140, 142],
  hiresVsExits: [
    { month: 'Jan', hires: 4, exits: 1 },
    { month: 'Feb', hires: 3, exits: 2 },
    { month: 'Mar', hires: 5, exits: 1 },
    { month: 'Apr', hires: 4, exits: 2 },
    { month: 'May', hires: 6, exits: 3 },
    { month: 'Jun', hires: 6, exits: 2 },
  ],
}

export const PAYROLL_ANALYTICS = {
  monthlyCost: 2480000,
  costPerEmployee: 17465,
  momChange: 2.1,
  trend6: [2200000, 2280000, 2320000, 2380000, 2420000, 2480000],
  byDept: [
    { name: 'Engineering', value: 38 },
    { name: 'Sales', value: 22 },
    { name: 'Finance', value: 12 },
    { name: 'Other', value: 28 },
  ],
}

export const ATTENDANCE_ANALYTICS = {
  avgRate: 94.3,
  lateArrivals: 8,
  absenteeism: 2.1,
  wfhDays: 42,
  weeklyTrend: [
    { week: 'W1', rate: 92.8 },
    { week: 'W2', rate: 94.1 },
    { week: 'W3', rate: 93.5 },
    { week: 'W4', rate: 95.2 },
    { week: 'W5', rate: 94.8 },
    { week: 'W6', rate: 96.1 },
  ],
  byDept: [
    { dept: 'Engineering', rate: 95.1, late: 3 },
    { dept: 'Sales', rate: 91.2, late: 2 },
    { dept: 'Operations', rate: 93.8, late: 1 },
    { dept: 'HR', rate: 96.4, late: 0 },
    { dept: 'Finance', rate: 94.0, late: 2 },
  ],
}

export const ATTRITION_ANALYTICS = {
  monthly: 2.3,
  rolling12: 14.2,
  highRisk: 7,
  byDept: [
    { dept: 'Sales', rate: 3.2 },
    { dept: 'Engineering', rate: 1.8 },
    { dept: 'Operations', rate: 2.5 },
  ],
}
