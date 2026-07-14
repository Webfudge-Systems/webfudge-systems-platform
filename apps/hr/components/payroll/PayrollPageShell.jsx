'use client'

import { Wallet, TrendingDown, Banknote, FileText } from 'lucide-react'
import { Button, KPICard, LoadingSpinner, Modal } from '@webfudge/ui'
import { Select } from '../shared/HRSelect'
import HRPageHeader from '../layout/HRPageHeader'
import HRModulePage from '../layout/HRModulePage'
import HRKpiRow from '../layout/HRKpiRow'
import PayrollRunToolbar from './PayrollRunToolbar'
import { HR_ROOT_BREADCRUMB } from '../../lib/pageHeader'

export default function PayrollPageShell({
  sectionLabel = 'Overview',
  subtitle: subtitleOverride,
  stats,
  selectedRun,
  runs,
  selectedRunId,
  onRunChange,
  onCreateRun,
  showRecalculate,
  onRecalculate,
  loading = false,
  runCreateOpen,
  onRunCreateClose,
  newRunMonth,
  onNewRunMonthChange,
  newRunYear,
  onNewRunYearChange,
  onCreateRunSubmit,
  showRunToolbar = true,
  showKpis = true,
  children,
}) {
  if (loading) {
    return (
      <HRModulePage>
        <div className="py-16">
          <LoadingSpinner size="lg" message="Loading payroll..." />
        </div>
      </HRModulePage>
    )
  }

  const runSubtitle = `${selectedRun?.monthLabel || 'No run selected'} · ${stats.employees} employees · ${String(stats.runStatus || '').toUpperCase()}`
  const subtitle = subtitleOverride ?? runSubtitle

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title={sectionLabel === 'Overview' ? 'Payroll' : sectionLabel}
        subtitle={subtitle}
        breadcrumb={[
          HR_ROOT_BREADCRUMB,
          { label: 'Payroll', href: '/payroll' },
          ...(sectionLabel !== 'Overview' ? [{ label: sectionLabel, href: null }] : []),
        ]}
        showProfile
        showActions
      />

      {showKpis ? (
        <HRKpiRow>
          <KPICard title="Total Gross" value={stats.totalGross} subtitle={`${stats.employees} employees · ${stats.month}`} icon={Wallet} colorScheme="orange" />
          <KPICard title="Deductions" value={stats.totalDeductions} subtitle="PF, ESI, PT, TDS" icon={TrendingDown} colorScheme="orange" />
          <KPICard title="Total Net" value={stats.totalNet} subtitle={`Run status: ${stats.runStatus}`} icon={Banknote} colorScheme="orange" />
          <KPICard title="PF Liability" value={stats.pfLiability} subtitle="Provident fund contribution" icon={FileText} colorScheme="orange" />
        </HRKpiRow>
      ) : null}

      {showRunToolbar ? (
        <PayrollRunToolbar
          runs={runs}
          selectedRunId={selectedRunId}
          onRunChange={onRunChange}
          onCreateRun={onCreateRun}
          showRecalculate={showRecalculate}
          onRecalculate={onRecalculate}
        />
      ) : null}

      {children}

      <Modal isOpen={runCreateOpen} onClose={onRunCreateClose} title="Run Payroll" size="md">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Month"
              value={newRunMonth}
              onChange={onNewRunMonthChange}
              options={Array.from({ length: 12 }, (_, idx) => ({
                value: String(idx + 1),
                label: new Date(2026, idx, 1).toLocaleString('en-US', { month: 'long' }),
              }))}
            />
            <Select
              label="Year"
              value={newRunYear}
              onChange={onNewRunYearChange}
              options={Array.from({ length: 6 }, (_, idx) => {
                const year = new Date().getFullYear() - 2 + idx
                return { value: String(year), label: String(year) }
              })}
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-200 pt-5">
            <Button variant="outline" onClick={onRunCreateClose}>
              Cancel
            </Button>
            <Button onClick={onCreateRunSubmit}>Create Run</Button>
          </div>
        </div>
      </Modal>
    </HRModulePage>
  )
}
