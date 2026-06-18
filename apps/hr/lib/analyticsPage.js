import {
  HEADCOUNT_ANALYTICS,
  PAYROLL_ANALYTICS,
  ATTENDANCE_ANALYTICS,
  ATTRITION_ANALYTICS,
} from './mock-data/analytics'

export const ORANGE = '#F97316'
export const PIE_COLORS = ['#F97316', '#FB923C', '#FDBA74', '#FED7AA', '#EA580C']

export function getAnalyticsTabItems() {
  return [
    { key: 'headcount', label: 'Headcount', count: HEADCOUNT_ANALYTICS.byDept.length },
    { key: 'payroll', label: 'Payroll Cost', count: PAYROLL_ANALYTICS.byDept.length },
    { key: 'attendance', label: 'Attendance', count: 0 },
    { key: 'attrition', label: 'Attrition', count: ATTRITION_ANALYTICS.byDept.length },
    { key: 'custom', label: 'Custom Reports', count: 2 },
  ]
}

export function computeHeadcountKpis(data = HEADCOUNT_ANALYTICS) {
  return {
    total: data.total,
    newHires: data.newHires,
    exits: data.exits,
    netChange: data.netChange,
  }
}

export function computePayrollKpis(data = PAYROLL_ANALYTICS) {
  const formatL = (n) => `₹${(n / 100000).toFixed(1)}L`
  return {
    monthlyCost: formatL(data.monthlyCost),
    costPerEmployee: `₹${data.costPerEmployee.toLocaleString('en-IN')}`,
    momChange: `+${data.momChange}%`,
  }
}

export function computeAttendanceKpis(data = ATTENDANCE_ANALYTICS) {
  return {
    avgRate: `${data.avgRate}%`,
    lateArrivals: data.lateArrivals,
    absenteeism: `${data.absenteeism}%`,
  }
}

export function computeAttritionKpis(data = ATTRITION_ANALYTICS) {
  return {
    monthly: `${data.monthly}%`,
    rolling12: `${data.rolling12}%`,
    highRisk: data.highRisk,
  }
}

export function headcountTrendData(data = HEADCOUNT_ANALYTICS) {
  const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return data.trend12.map((count, i) => ({
    month: months[i] || `M${i + 1}`,
    count,
  }))
}

export function payrollTrendData(data = PAYROLL_ANALYTICS) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
  return data.trend6.map((v, i) => ({
    month: months[i],
    value: Number((v / 100000).toFixed(2)),
  }))
}
