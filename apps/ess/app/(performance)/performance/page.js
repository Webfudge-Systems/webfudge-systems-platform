'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { TabsWithActions } from '@webfudge/ui'
import EmployeeGate from '../../../components/shared/EmployeeGate'
import ESSModulePage from '../../../components/layout/ESSModulePage'
import ESSPageHeader from '../../../components/layout/ESSPageHeader'
import ESSPerformanceKpiRow from '../../../components/performance/ESSPerformanceKpiRow'
import ESSPerformanceGoalsPanel from '../../../components/performance/ESSPerformanceGoalsPanel'
import ESSPerformanceReviewsPanel from '../../../components/performance/ESSPerformanceReviewsPanel'
import ESSPerformanceFeedbackPanel from '../../../components/performance/ESSPerformanceFeedbackPanel'
import ESSPerformanceAppraisalPanel from '../../../components/performance/ESSPerformanceAppraisalPanel'
import { useCurrentEmployee } from '../../../hooks/useCurrentEmployee'
import {
  PERFORMANCE_ESS_UPDATED_EVENT,
  computeEmployeePerformanceStats,
  listEmployeeAppraisals,
  listEmployeeGoals,
  listEmployeePendingFeedback,
  listEmployeePips,
  listEmployeeReceivedFeedback,
  listEmployeeReviewCycles,
} from '../../../lib/performanceEssService'

const TAB_ITEMS = [
  { id: 'overview', label: 'Overview' },
  { id: 'goals', label: 'Goals' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'appraisal', label: 'My Appraisal' },
]

export default function PerformancePage() {
  const { employee, membershipId, loading: employeeLoading } = useCurrentEmployee()
  const [activeTab, setActiveTab] = useState('overview')
  const [tick, setTick] = useState(0)

  const refresh = useCallback(() => setTick((n) => n + 1), [])

  useEffect(() => {
    const onUpdated = () => refresh()
    window.addEventListener(PERFORMANCE_ESS_UPDATED_EVENT, onUpdated)
    window.addEventListener('hr:goals-updated', onUpdated)
    window.addEventListener('hr:appraisals-updated', onUpdated)
    window.addEventListener('hr:reviews-updated', onUpdated)
    window.addEventListener('hr:feedback-updated', onUpdated)
    return () => {
      window.removeEventListener(PERFORMANCE_ESS_UPDATED_EVENT, onUpdated)
      window.removeEventListener('hr:goals-updated', onUpdated)
      window.removeEventListener('hr:appraisals-updated', onUpdated)
      window.removeEventListener('hr:reviews-updated', onUpdated)
      window.removeEventListener('hr:feedback-updated', onUpdated)
    }
  }, [refresh])

  const goals = useMemo(
    () => (employeeLoading ? [] : listEmployeeGoals(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )
  const cycles = useMemo(() => listEmployeeReviewCycles(), [tick])
  const appraisals = useMemo(
    () => (employeeLoading ? [] : listEmployeeAppraisals(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )
  const pips = useMemo(
    () => (employeeLoading ? [] : listEmployeePips(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )
  const pendingFeedback = useMemo(
    () => (employeeLoading ? [] : listEmployeePendingFeedback(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )
  const receivedFeedback = useMemo(
    () => (employeeLoading ? [] : listEmployeeReceivedFeedback(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )
  const stats = useMemo(
    () => (employeeLoading ? computeEmployeePerformanceStats(null) : computeEmployeePerformanceStats(employee, membershipId)),
    [employee, membershipId, employeeLoading, tick],
  )

  return (
    <EmployeeGate>
      <ESSModulePage className="!space-y-6">
        <ESSPageHeader
          title="My Performance"
          subtitle="Goals, reviews, feedback, and appraisal outcomes"
          breadcrumb={[
            { label: 'Overview', href: '/overview' },
            { label: 'Performance', href: '/performance' },
          ]}
          showBack={false}
        />

        <ESSPerformanceKpiRow stats={stats} />

        <TabsWithActions
          tabs={TAB_ITEMS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          variant="pill"
          pillTrack="hug"
        />

        {activeTab === 'overview' ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <ESSPerformanceGoalsPanel goals={goals.slice(0, 3)} />
            <ESSPerformanceReviewsPanel cycles={cycles.filter((c) => c.status === 'Active')} />
            <ESSPerformanceFeedbackPanel
              pending={pendingFeedback.slice(0, 3)}
              received={receivedFeedback.slice(0, 2)}
              className="xl:col-span-2"
            />
          </div>
        ) : null}

        {activeTab === 'goals' ? <ESSPerformanceGoalsPanel goals={goals} /> : null}
        {activeTab === 'reviews' ? <ESSPerformanceReviewsPanel cycles={cycles} /> : null}
        {activeTab === 'feedback' ? (
          <ESSPerformanceFeedbackPanel pending={pendingFeedback} received={receivedFeedback} />
        ) : null}
        {activeTab === 'appraisal' ? (
          <ESSPerformanceAppraisalPanel appraisals={appraisals} pips={pips} />
        ) : null}
      </ESSModulePage>
    </EmployeeGate>
  )
}
