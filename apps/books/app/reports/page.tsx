import { Card } from '@webfudge/ui'

const categories = [
  'Business Overview',
  'Sales',
  'Receivables',
  'Payables',
  'Purchases and Expenses',
  'Projects and Timesheet',
  'Accountant',
]

const reports = [
  'Profit and Loss',
  'Cash Flow Statement',
  'Balance Sheet',
  'Profitability by Project',
  'Utilization Rate',
  'Aged Receivables',
  'Revenue by Service Type',
]

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports Center</h1>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="p-4 lg:col-span-1">
          <input className="w-full px-3 py-2 border rounded-lg text-sm mb-3" placeholder="Search reports" />
          <div className="space-y-2">
            {categories.map((item) => <div key={item} className="text-sm text-gray-700">{item}</div>)}
          </div>
        </Card>
        <Card className="p-4 lg:col-span-3">
          <div className="space-y-3">
            {reports.map((item) => <div key={item} className="text-sm font-medium text-brand-primary">{item}</div>)}
          </div>
        </Card>
      </div>
    </div>
  )
}
