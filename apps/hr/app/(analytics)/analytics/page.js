'use client'

import { useState } from 'react'
import HRPageHeader from '../../../components/layout/HRPageHeader'
import AnalyticsCommandBar from '../../../components/analytics/AnalyticsCommandBar'
import HeadcountAnalyticsPanel from '../../../components/analytics/panels/HeadcountAnalyticsPanel'
import PayrollAnalyticsPanel from '../../../components/analytics/panels/PayrollAnalyticsPanel'
import AttendanceAnalyticsPanel from '../../../components/analytics/panels/AttendanceAnalyticsPanel'
import AttritionAnalyticsPanel from '../../../components/analytics/panels/AttritionAnalyticsPanel'
import CustomReportsPanel from '../../../components/analytics/panels/CustomReportsPanel'

const TABS = [
  { key: 'headcount', label: 'Headcount' },
  { key: 'payroll', label: 'Payroll' },
  { key: 'attendance', label: 'Attendance' },
  { key: 'attrition', label: 'Attrition' },
  { key: 'custom', label: 'Custom' },
]

const PANELS = {
  headcount: HeadcountAnalyticsPanel,
  payroll: PayrollAnalyticsPanel,
  attendance: AttendanceAnalyticsPanel,
  attrition: AttritionAnalyticsPanel,
  custom: CustomReportsPanel,
}

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('headcount')
  const [period, setPeriod] = useState('fy2526')

  const Panel = PANELS[activeTab] || HeadcountAnalyticsPanel

  return (
    <div className="min-h-full space-y-4 bg-gradient-to-b from-orange-50/40 via-slate-50/80 to-white p-4 md:p-6">
      <HRPageHeader
        title="Analytics & Reports"
        subtitle="Workforce insights with charts, trends, and exportable breakdowns"
        breadcrumb={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Analytics', href: '/analytics' },
        ]}
        showActions
        onImportClick={() => console.log('Import analytics')}
        onExportClick={() => console.log('Export analytics')}
      />

      <AnalyticsCommandBar
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        period={period}
        onPeriodChange={setPeriod}
        onExport={() => console.log('Export', activeTab, period)}
      />

      <Panel />
    </div>
  )
}
