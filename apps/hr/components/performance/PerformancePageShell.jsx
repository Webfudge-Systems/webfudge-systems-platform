'use client'

import { Target, ClipboardList, TrendingUp, AlertTriangle, CheckCircle, BarChart3, MessageSquare, FileText, Clock, Users } from 'lucide-react'
import { KPICard } from '@webfudge/ui'
import HRPageHeader from '../layout/HRPageHeader'
import HRModulePage from '../layout/HRModulePage'
import HRKpiRow from '../layout/HRKpiRow'
import { HR_ROOT_BREADCRUMB } from '../../lib/pageHeader'

function PerformanceGoalsKpis({ stats }) {
  return (
    <HRKpiRow>
      <KPICard
        title="Review Cycle"
        value={`${stats.cycleCompletion}%`}
        subtitle={stats.activeCycleName}
        icon={ClipboardList}
        colorScheme="orange"
      />
      <KPICard
        title="Company OKRs"
        value={stats.okrCount}
        subtitle={`${stats.krCount} key results`}
        icon={Target}
        colorScheme="orange"
      />
      <KPICard
        title="Pending Appraisals"
        value={stats.pendingAppraisals}
        subtitle={`${stats.totalAppraisals} total`}
        icon={TrendingUp}
        colorScheme="orange"
      />
      <KPICard
        title="Active PIPs"
        value={stats.activePips}
        subtitle={`${stats.pendingFeedback} feedback due`}
        icon={AlertTriangle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}

function PerformanceReviewsKpis({ reviewStats }) {
  return (
    <HRKpiRow>
      <KPICard
        title="Total Cycles"
        value={reviewStats.totalCycles}
        subtitle="All review periods"
        icon={ClipboardList}
        colorScheme="orange"
      />
      <KPICard
        title="Active Cycles"
        value={reviewStats.activeCount}
        subtitle={reviewStats.activeCycleName}
        icon={BarChart3}
        colorScheme="orange"
      />
      <KPICard
        title="Avg Completion"
        value={`${reviewStats.avgCompletion}%`}
        subtitle={`Active cycle at ${reviewStats.activeCycleCompletion}%`}
        icon={TrendingUp}
        colorScheme="orange"
      />
      <KPICard
        title="Closed Cycles"
        value={reviewStats.closedCount}
        subtitle="Completed reviews"
        icon={CheckCircle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}

function PerformanceFeedbackKpis({ feedbackStats }) {
  return (
    <HRKpiRow>
      <KPICard
        title="Pending"
        value={feedbackStats.pendingCount}
        subtitle={`${feedbackStats.peerPending} peer · ${feedbackStats.managerPending} manager`}
        icon={MessageSquare}
        colorScheme="orange"
      />
      <KPICard
        title="Received"
        value={feedbackStats.receivedCount}
        subtitle="Anonymized feedback"
        icon={FileText}
        colorScheme="orange"
      />
      <KPICard
        title="Next Due"
        value={feedbackStats.nextDueDate}
        subtitle={feedbackStats.nextDueLabel}
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Total Items"
        value={feedbackStats.pendingCount + feedbackStats.receivedCount}
        subtitle="Pending + received"
        icon={CheckCircle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}

function PerformanceAppraisalsKpis({ appraisalStats }) {
  return (
    <HRKpiRow>
      <KPICard
        title="Total Appraisals"
        value={appraisalStats.totalAppraisals}
        subtitle={`${appraisalStats.approvedCount} approved`}
        icon={TrendingUp}
        colorScheme="orange"
      />
      <KPICard
        title="Pending"
        value={appraisalStats.pendingCount}
        subtitle="Awaiting approval"
        icon={Clock}
        colorScheme="orange"
      />
      <KPICard
        title="Avg Rating"
        value={appraisalStats.avgRating}
        subtitle={`${appraisalStats.avgRevision}% avg revision`}
        icon={BarChart3}
        colorScheme="orange"
      />
      <KPICard
        title="Promotions"
        value={appraisalStats.promotionCount}
        subtitle="Recommended"
        icon={CheckCircle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}

function PerformancePipsKpis({ pipStats }) {
  return (
    <HRKpiRow>
      <KPICard
        title="Total PIPs"
        value={pipStats.totalPips}
        subtitle="All improvement plans"
        icon={AlertTriangle}
        colorScheme="orange"
      />
      <KPICard
        title="Active PIPs"
        value={pipStats.activeCount}
        subtitle="In progress"
        icon={Users}
        colorScheme="orange"
      />
      <KPICard
        title="Avg Milestones"
        value={`${pipStats.avgMilestoneCompletion}%`}
        subtitle="Completion across plans"
        icon={TrendingUp}
        colorScheme="orange"
      />
      <KPICard
        title="Closed / Ended"
        value={pipStats.closedCount + pipStats.terminatedCount}
        subtitle={`${pipStats.closedCount} closed · ${pipStats.terminatedCount} terminated`}
        icon={CheckCircle}
        colorScheme="orange"
      />
    </HRKpiRow>
  )
}

export default function PerformancePageShell({
  sectionLabel = 'Goals',
  subtitle,
  stats,
  reviewStats,
  feedbackStats,
  appraisalStats,
  pipStats,
  showKpis = true,
  children,
}) {
  const pageTitle = sectionLabel === 'Goals' ? 'Performance' : sectionLabel

  return (
    <HRModulePage className="!space-y-6">
      <HRPageHeader
        title={pageTitle}
        subtitle={subtitle}
        breadcrumb={[
          HR_ROOT_BREADCRUMB,
          { label: 'Performance', href: '/performance' },
          ...(sectionLabel !== 'Goals' ? [{ label: sectionLabel, href: null }] : []),
        ]}
        showProfile
        showActions
        onImportClick={() => console.log('Import performance')}
        onExportClick={() => console.log('Export performance')}
      />

      {showKpis && stats ? <PerformanceGoalsKpis stats={stats} /> : null}
      {showKpis && reviewStats ? <PerformanceReviewsKpis reviewStats={reviewStats} /> : null}
      {showKpis && feedbackStats ? <PerformanceFeedbackKpis feedbackStats={feedbackStats} /> : null}
      {showKpis && appraisalStats ? <PerformanceAppraisalsKpis appraisalStats={appraisalStats} /> : null}
      {showKpis && pipStats ? <PerformancePipsKpis pipStats={pipStats} /> : null}

      {children}
    </HRModulePage>
  )
}
