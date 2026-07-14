'use client'

import { Receipt, CheckCircle, Clock, XCircle } from 'lucide-react'
import { KPICard, LoadingSpinner } from '@webfudge/ui'
import HRPageHeader from '../layout/HRPageHeader'
import HRModulePage from '../layout/HRModulePage'
import HRKpiRow from '../layout/HRKpiRow'
import { HR_ROOT_BREADCRUMB } from '../../lib/pageHeader'

export default function ExpensesPageShell({
  sectionLabel = 'Claims',
  subtitle: subtitleOverride,
  stats,
  loading = false,
  showKpis = true,
  kpiSection,
  onImportClick,
  onExportClick,
  children,
}) {
  if (loading) {
    return (
      <HRModulePage>
        <div className="py-16">
          <LoadingSpinner size="lg" message="Loading expenses..." />
        </div>
      </HRModulePage>
    )
  }

  const defaultSubtitle = `${stats.pending} pending claim${stats.pending === 1 ? '' : 's'} · ${stats.claimedLabel} claimed this month`
  const subtitle = subtitleOverride ?? defaultSubtitle
  const title = sectionLabel === 'Claims' ? 'Expenses' : sectionLabel

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title={title}
        subtitle={subtitle}
        breadcrumb={[
          HR_ROOT_BREADCRUMB,
          { label: 'Expenses', href: '/expenses' },
          ...(sectionLabel !== 'Claims' ? [{ label: sectionLabel, href: null }] : []),
        ]}
        showProfile
        showActions
        showSearch
        onImportClick={onImportClick}
        onExportClick={onExportClick}
      />

      {showKpis ? (
        kpiSection || (
          <HRKpiRow>
          <KPICard
            title="Pending"
            value={stats.pending}
            subtitle={`${stats.pendingLabel} awaiting approval`}
            icon={Clock}
            colorScheme="orange"
          />
          <KPICard
            title="Approved"
            value={stats.approved}
            subtitle={`${stats.approvedLabel} approved`}
            icon={CheckCircle}
            colorScheme="orange"
          />
          <KPICard
            title="Rejected"
            value={stats.rejected}
            subtitle={stats.rejected === 0 ? 'No rejections' : `${stats.rejectedLabel} declined`}
            icon={XCircle}
            colorScheme="orange"
          />
          <KPICard
            title="Total Claims"
            value={stats.total}
            subtitle={`${stats.claimedLabel} claimed`}
            icon={Receipt}
            colorScheme="orange"
          />
        </HRKpiRow>
        )
      ) : null}

      {children}
    </HRModulePage>
  )
}
